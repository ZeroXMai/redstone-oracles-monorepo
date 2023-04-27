import axios from "axios";
import { RedstoneOraclesState } from "redstone-oracles-smartweave-contracts/src/contracts/redstone-oracle-registry/types";
import redstoneOraclesInitialState from "redstone-oracles-smartweave-contracts/src/contracts/redstone-oracle-registry/initial-state.json";
import {
  RedstonePayloadSingleSign,
  SignedDataPackage,
  SignedDataPackagePlainObj,
} from "redstone-protocol";

export const DEFAULT_CACHE_SERVICE_URLS = [
  "https://oracle-gateway-1.a.redstone.finance",
  "https://oracle-gateway-2.a.redstone.finance",
];

const ALL_FEEDS_KEY = "___ALL_FEEDS___";

export interface DataPackagesRequestParams {
  dataServiceId: string;
  uniqueSignersCount: number;
  dataFeeds?: string[];
  disablePayloadsDryRun?: boolean;
}

export interface DataPackagesResponse {
  [dataFeedId: string]: SignedDataPackage[];
}

export const getOracleRegistryState =
  async (): Promise<RedstoneOraclesState> => {
    return redstoneOraclesInitialState;
  };

export const getDataServiceIdForSigner = (
  oracleState: RedstoneOraclesState,
  signerAddress: string
) => {
  for (const nodeDetails of Object.values(oracleState.nodes)) {
    if (nodeDetails.evmAddress.toLowerCase() === signerAddress.toLowerCase()) {
      return nodeDetails.dataServiceId;
    }
  }
  throw new Error(`Data service not found for ${signerAddress}`);
};

export const parseDataPackagesResponse = (
  dpResponse: {
    [dataFeedId: string]: SignedDataPackagePlainObj[];
  },
  reqParams: DataPackagesRequestParams
): DataPackagesResponse => {
  const parsedResponse: DataPackagesResponse = {};

  const requestedDataFeedIds = reqParams.dataFeeds ?? [ALL_FEEDS_KEY];

  for (const dataFeedId of requestedDataFeedIds) {
    const dataFeedPackages = dpResponse[dataFeedId];

    if (!dataFeedPackages) {
      throw new Error(
        `Requested data feed id is not included in response: ${dataFeedId}`
      );
    }

    if (dataFeedPackages.length < reqParams.uniqueSignersCount) {
      throw new Error(
        `Too few unique signers for the data feed: ${dataFeedId}. ` +
          `Expected: ${reqParams.uniqueSignersCount}. ` +
          `Received: ${dataFeedPackages.length}`
      );
    }

    parsedResponse[dataFeedId] = dataFeedPackages
      .sort((a, b) => b.timestampMilliseconds - a.timestampMilliseconds) // we prefer newer data packages in the first order
      .slice(0, reqParams.uniqueSignersCount)
      .map((dataPackage: SignedDataPackagePlainObj) =>
        SignedDataPackage.fromObj(dataPackage)
      );
  }

  return parsedResponse;
};

const errToString = (e: any): string => {
  if (e instanceof AggregateError) {
    const stringifiedErrors = e.errors.reduce(
      (prev, oneOfErrors, curIndex) =>
        (prev += `${curIndex}: ${oneOfErrors.message}, `),
      ""
    );
    return `${e.message}: ${stringifiedErrors}`;
  } else {
    return e.message;
  }
};

export const requestDataPackages = async (
  reqParams: DataPackagesRequestParams,
  urls: string[] = DEFAULT_CACHE_SERVICE_URLS
): Promise<DataPackagesResponse> => {
  const promises = prepareDataPackagePromises(reqParams, urls);
  try {
    return await Promise.any(promises);
  } catch (e: any) {
    const errMessage = `Request failed ${JSON.stringify({
      reqParams,
      urls,
    })}, Original error: ${errToString(e)}`;
    throw new Error(errMessage);
  }
};

const prepareDataPackagePromises = (
  reqParams: DataPackagesRequestParams,
  urls: string[]
) => {
  return urls.map((url) =>
    axios
      .get(`${url}/data-packages/latest/${reqParams.dataServiceId}`)
      .then((response) => parseDataPackagesResponse(response.data, reqParams))
  );
};

export const requestRedstonePayload = async (
  reqParams: DataPackagesRequestParams,
  urls: string[] = DEFAULT_CACHE_SERVICE_URLS,
  unsignedMetadataMsg?: string
): Promise<string> => {
  const signedDataPackagesResponse = await requestDataPackages(reqParams, urls);
  const signedDataPackages = Object.values(signedDataPackagesResponse).flat();

  return RedstonePayloadSingleSign.prepare(signedDataPackages, unsignedMetadataMsg || "");
};

export default {
  getOracleRegistryState,
  requestDataPackages,
  getDataServiceIdForSigner,
  requestRedstonePayload,
  parseDataPackagesResponse,
};
