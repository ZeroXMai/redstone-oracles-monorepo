import { ethers } from "ethers";
import { NodeConfig } from "../src/types";

const baseManifest = {
  interval: 2000,
  priceAggregator: "median",
  sourceTimeout: 3000,
  deviationCheck: {
    deviationWithRecentValues: {
      maxPercent: 25,
      maxDelayMilliseconds: 300000,
    },
  },
};

export const MOCK_MANIFEST = {
  ...baseManifest,
  tokens: {
    BTC: {
      source: ["bitfinex", "ftx"],
    },
    ETH: {
      source: ["binance", "bitfinex"],
    },
    USDT: {
      source: ["ftx", "binance"],
    },
  },
};

const MOCK_ETH_PRIV_KEY =
  "0x1111111111111111111111111111111111111111111111111111111111111111";

export const MOCK_NODE_CONFIG: NodeConfig = {
  enableJsonLogs: false,
  enablePerformanceTracking: false,
  printDiagnosticInfo: false,
  manifestRefreshInterval: 120000,
  overrideManifestUsingFile: MOCK_MANIFEST,
  privateKeys: {
    ethereumPrivateKey: MOCK_ETH_PRIV_KEY,
  },
  ethereumAddress: new ethers.Wallet(MOCK_ETH_PRIV_KEY).address,
  levelDbLocation: "oracle-node-level-db-tests",
  ttlForPricesInLocalDBInMilliseconds: 900000,
  avalancheRpcUrls: ["https://mock-rpc.url"],
  ethMainRpcUrls: ["https://mock-rpc.url"],
  arbitrumRpcUrls: ["https://mock-rpc.url"],
  enableStreamrBroadcasting: false,
  mockPricesUrlOrPath: "",
  minDataFeedsPercentageForBigPackage: 50,
  coingeckoApiUrl: "",
  enableHttpServer: false,
  pricesHardLimitsUrl: "mock-hard-prices-limits-url",
  newyorkfedRatesUrl: "",
};

export const mockHardLimits = {
  BTC: {
    lower: 440,
    upper: 450,
  },
  ETH: {
    lower: 40,
    upper: 45,
  },
};
