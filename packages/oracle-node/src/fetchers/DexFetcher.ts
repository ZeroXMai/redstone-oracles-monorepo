import graphProxy from "../utils/graph-proxy";
import { PricesObj } from "../types";
import { BaseFetcher } from "./BaseFetcher";

export interface DexFetcherResponse {
  data: {
    pairs: Pair[];
  };
}

export interface Pair {
  id: string;
  token0: Token;
  token1: Token;
  reserve0: string;
  reserve1: string;
  reserveUSD: string;
}

interface Token {
  symbol: string;
}

interface SymbolToPairId {
  [symbol: string]: string;
}

export class DexFetcher extends BaseFetcher {
  protected retryForInvalidResponse: boolean = true;

  constructor(
    name: string,
    protected readonly subgraphUrl: string,
    protected readonly symbolToPairIdObj: SymbolToPairId
  ) {
    super(name);
  }

  async fetchData(ids: string[]): Promise<DexFetcherResponse> {
    const pairIds = this.convertSymbolsToPairIds(ids, this.symbolToPairIdObj);

    const query = `{
      pairs(where: { id_in: ${JSON.stringify(pairIds)} }) {
        id
        token0 {
          symbol
        }
        token1 {
          symbol
        }
        reserve0
        reserve1
        reserveUSD
      }
    }`;

    return await graphProxy.executeQuery(this.subgraphUrl, query);
  }

  validateResponse(response: DexFetcherResponse): boolean {
    return response !== undefined && response.data !== undefined;
  }

  async extractPrices(
    response: DexFetcherResponse,
    assetIds: string[]
  ): Promise<PricesObj> {
    const pricesObj: PricesObj = {};

    for (const currentAssetId of assetIds) {
      const pairId = this.symbolToPairIdObj[currentAssetId];
      const pair = response.data.pairs.find((pair) => pair.id === pairId);

      if (!pair) {
        this.logger.warn(
          `Pair is not in response. Id: ${pairId}. Symbol: ${currentAssetId}. Source: ${this.name}`
        );
      } else {
        const symbol0 = pair.token0.symbol;
        const symbol1 = pair.token1.symbol;
        const reserve0 = parseFloat(pair.reserve0);
        const reserve1 = parseFloat(pair.reserve1);
        const reserveUSD = parseFloat(pair.reserveUSD);

        if (symbol0 === currentAssetId) {
          pricesObj[currentAssetId] = reserveUSD / (2 * reserve0);
        } else if (symbol1 === currentAssetId) {
          pricesObj[currentAssetId] = reserveUSD / (2 * reserve1);
        }
      }
    }

    return pricesObj;
  }

  protected convertSymbolsToPairIds(
    symbols: string[],
    symbolToPairId: SymbolToPairId
  ): string[] {
    const pairIds = [];

    for (const symbol of symbols) {
      const pairId = symbolToPairId[symbol];
      if (pairId === undefined) {
        this.logger.warn(
          `Source "${this.name}" does not support symbol: "${symbol}"`
        );
      } else {
        pairIds.push(pairId);
      }
    }

    return pairIds;
  }
}
