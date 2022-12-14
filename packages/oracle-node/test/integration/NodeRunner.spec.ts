import NodeRunner from "../../src/NodeRunner";
import { JWKInterface } from "arweave/node/lib/wallet";
import { mocked } from "ts-jest/utils";
import { ArweaveProxy } from "../../src/arweave/ArweaveProxy";
import fetchers from "../../src/fetchers";
import axios from "axios";
import ArweaveService from "../../src/arweave/ArweaveService";
import { any } from "jest-mock-extended";
import { timeout } from "../../src/utils/promise-timeout";
import { MOCK_NODE_CONFIG } from "../helpers";
import { NodeConfig } from "../../src/types";
import {
  clearPricesSublevel,
  closeLocalLevelDB,
  savePrices,
} from "../../src/db/local-db";
import emptyManifest from "../../manifests/dev/empty.json";

/****** MOCKS START ******/
const broadcastingUrl =
  "http://mock-direct-cache-service-url/data-packages/bulk";
const mockArProxy = {
  getAddress: () => Promise.resolve("mockArAddress"),
};
jest.mock("../../src/arweave/ArweaveProxy", () => {
  return {
    ArweaveProxy: jest.fn().mockImplementation(() => mockArProxy),
  };
});

jest.mock("../../src/signers/EvmPriceSignerOld", () => {
  return jest.fn().mockImplementation(() => {
    return {
      signPricePackage: (pricePackage: any) => ({
        liteSignature: "mock_evm_signed_lite",
        signerAddress: "mock_evm_signer_address",
        pricePackage,
      }),
    };
  });
});

jest.mock("../../src/fetchers/coingecko/CoingeckoFetcher");
jest.mock("../../src/fetchers/uniswap/UniswapFetcher");

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;
mockedAxios.post.mockImplementation((url) => {
  if (["https://api.redstone.finance/metrics", broadcastingUrl].includes(url)) {
    return Promise.resolve();
  }
  return Promise.reject(
    `mock for ${url} not available and should not be called`
  );
});

let manifest: any = null;

jest.mock("../../src/utils/objects", () => ({
  // @ts-ignore
  ...jest.requireActual("../../src/utils/objects"),
  readJSON: () => null,
}));

jest.mock("uuid", () => ({ v4: () => "00000000-0000-0000-0000-000000000000" }));
/****** MOCKS END ******/

describe("NodeRunner", () => {
  const jwk: JWKInterface = {
    e: "e",
    kty: "kty",
    n: "n",
  };

  const nodeConfig: NodeConfig = {
    ...MOCK_NODE_CONFIG,
    useNewSigningAndBroadcasting: true,
  };

  const runTestNode = async () => {
    const sut = await NodeRunner.create({
      ...nodeConfig,
      overrideManifestUsingFile: manifest,
    });
    await sut.run();
  };

  beforeEach(async () => {
    await clearPricesSublevel();

    jest.useFakeTimers();
    mockedAxios.post.mockClear();

    jest.spyOn(global.Date, "now").mockImplementation(() => 111111111);

    fetchers["coingecko"] = {
      fetchAll: jest.fn().mockResolvedValue([{ symbol: "BTC", value: 444 }]),
    };
    fetchers["uniswap"] = {
      fetchAll: jest.fn().mockResolvedValue([
        { symbol: "BTC", value: 445 },
        {
          symbol: "ETH",
          value: 42,
        },
      ]),
    };

    manifest = {
      ...emptyManifest,
      defaultSource: ["uniswap"],
      tokens: {
        BTC: {
          source: ["coingecko"],
        },
        ETH: {},
      },
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(async () => {
    await closeLocalLevelDB();
  });

  describe("node set up", () => {
    it("should create node instance", async () => {
      const mockedArProxy = mocked(ArweaveProxy, true);

      const sut = await NodeRunner.create({
        ...nodeConfig,
        overrideManifestUsingFile: manifest,
      });

      expect(sut).not.toBeNull();
      expect(mockedArProxy).toHaveBeenCalledWith(jwk);
    });

    it("should throw if interval not divisble by 1000", async () => {
      manifest.interval = 60001;
      const sut = await NodeRunner.create({
        ...nodeConfig,
        overrideManifestUsingFile: manifest,
      });
      await expect(sut.run()).rejects.toThrowError(
        "Interval needs to be divisible by 1000"
      );
    });

    it("should create node when interval greater than 60 seconds", async () => {
      const mockedArProxy = mocked(ArweaveProxy, true);
      manifest.interval = 60000 * 5;
      const sut = await NodeRunner.create({
        ...nodeConfig,
        overrideManifestUsingFile: manifest,
      });

      expect(sut).not.toBeNull();
      expect(mockedArProxy).toHaveBeenCalledWith(jwk);
    });

    it("should throw if no maxDeviationPercent configured for token", async () => {
      const { deviationCheck, ...manifestWithoutDeviationCheck } = manifest;

      const sut = await NodeRunner.create({
        ...nodeConfig,
        overrideManifestUsingFile: manifestWithoutDeviationCheck,
      });

      await expect(sut.run()).rejects.toThrowError(
        "Could not determine deviationCheckConfig"
      );
    });

    it("should throw if no sourceTimeout", async () => {
      const { sourceTimeout, ...manifestWithoutSourceTimeout } = manifest;

      const sut = await NodeRunner.create({
        ...nodeConfig,
        overrideManifestUsingFile: manifestWithoutSourceTimeout,
      });

      await expect(sut.run()).rejects.toThrowError("No timeout configured for");
    });
  });

  describe("standard flow", () => {
    it("should broadcast fetched and signed prices", async () => {
      await runTestNode();

      expect(axios.post).toHaveBeenCalledWith(broadcastingUrl, {
        requestSignature:
          "0x86f00b6f14e46844e653f3ec4adc41ac51498063276b7869bfeef3a5a11e673d6471a0d728174e9e7965ecc891925c1e7d9a62dd2f39e392edb1100c693aeec71c",
        dataPackages: [
          {
            signature:
              "Qm4FMKLEMfuD2SwHQWL1AK9viW9O80ok1y4PKvCkKu8b6c4xMyOjSU1CiLjDB3PPimPUJN7AKE7RUTVuBI8TNhw=",
            timestampMilliseconds: 111110000,
            dataPoints: [
              {
                dataFeedId: "BTC",
                value: 444.5,
              },
            ],
          },
          {
            signature:
              "nYugX5486D0AEiZaoV8I+yxzcottFH+giz0U6maSeckCICN5tSPytiUF+/6UDePsZSN87vBZp7JWVSih8HX/3hs=",
            timestampMilliseconds: 111110000,
            dataPoints: [
              {
                dataFeedId: "ETH",
                value: 42,
              },
            ],
          },
          {
            signature:
              "LzvfZOMlkn619o297BO/4G51aFhpbUSpt+umC2ja1TV5QxKRyANoA8MGesw9hINi6hqDqcBqUlxw6r03gK3g2xs=",
            timestampMilliseconds: 111110000,
            dataPoints: [
              {
                dataFeedId: "BTC",
                value: 444.5,
              },
              {
                dataFeedId: "ETH",
                value: 42,
              },
            ],
          },
        ],
      });
    });
  });

  describe("invalid values handling", () => {
    const expectValueBroadcasted = (symbol: string, expectedValue: number) => {
      expect(axios.post).toHaveBeenCalledWith(
        broadcastingUrl,
        expect.objectContaining({
          dataPackages: expect.arrayContaining([
            expect.objectContaining({
              dataPoints: expect.arrayContaining([
                expect.objectContaining({
                  dataFeedId: symbol,
                  value: expectedValue,
                }),
              ]),
            }),
          ]),
        })
      );
    };

    it("should not broadcast fetched and signed prices if values deviate too much (maxPercent is 0)", async () => {
      await savePrices([
        { symbol: "BTC", value: 100, timestamp: Date.now() },
      ] as any);
      await runTestNode();
      expectValueBroadcasted("ETH", 42);
    });

    it("should filter out too deviated sources", async () => {
      await savePrices([
        { symbol: "BTC", value: 444, timestamp: Date.now() },
      ] as any);

      // Mocking coingecko fetcher to provide deviated value
      fetchers["coingecko"] = {
        fetchAll: jest.fn().mockResolvedValue([{ symbol: "BTC", value: 100 }]),
      };

      await runTestNode();

      expectValueBroadcasted("BTC", 445);
    });

    it("should filter out invalid sources", async () => {
      await savePrices([
        { symbol: "BTC", value: 444, timestamp: Date.now() },
      ] as any);

      // Mocking coingecko fetcher to provide invalid value
      fetchers["coingecko"] = {
        fetchAll: jest.fn().mockResolvedValue([{ symbol: "BTC", value: 0 }]),
      };

      await runTestNode();

      expectValueBroadcasted("BTC", 445);
    });

    it("should not broadcast if all sources provide invalid value", async () => {
      // Mocking fetchers to provide invalid values
      fetchers["coingecko"] = {
        fetchAll: jest.fn().mockResolvedValue([{ symbol: "BTC", value: -1 }]),
      };
      fetchers["uniswap"] = {
        fetchAll: jest.fn().mockResolvedValue([
          { symbol: "BTC", value: -10 },
          {
            symbol: "ETH",
            value: "error",
          },
        ]),
      };

      await runTestNode();

      expect(axios.post).not.toHaveBeenCalledWith(broadcastingUrl, any());
    });
  });

  describe("when overrideManifestUsingFile flag is null", () => {
    let nodeConfigManifestFromAr: any;
    beforeEach(() => {
      nodeConfigManifestFromAr = {
        ...nodeConfig,
        overrideManifestUsingFile: null,
      };
    });

    it("should download prices when manifest is available", async () => {
      // given
      const arServiceSpy = jest
        .spyOn(ArweaveService.prototype, "getCurrentManifest")
        .mockImplementation(() => Promise.resolve(manifest));

      const sut = await NodeRunner.create(nodeConfigManifestFromAr);

      await sut.run();

      expect(fetchers.uniswap.fetchAll).toHaveBeenCalled();

      arServiceSpy.mockClear();
    });

    it("should not create NodeRunner instance until manifest is available", async () => {
      // given
      jest.useRealTimers();
      let arServiceSpy = jest
        .spyOn(ArweaveService.prototype, "getCurrentManifest")
        .mockImplementation(async () => {
          await timeout(200);
          return Promise.reject("no way!");
        });

      // this effectively makes manifest available after 100ms - so
      // we expect that second manifest fetching trial will succeed.
      setTimeout(() => {
        arServiceSpy = jest
          .spyOn(ArweaveService.prototype, "getCurrentManifest")
          .mockImplementation(() => Promise.resolve(manifest));
      }, 100);
      const sut = await NodeRunner.create(nodeConfigManifestFromAr);
      expect(sut).not.toBeNull();
      expect(ArweaveService.prototype.getCurrentManifest).toHaveBeenCalledTimes(
        2
      );
      arServiceSpy.mockClear();
      jest.useFakeTimers();
    });

    it("should continue working when update manifest fails", async () => {
      // given
      nodeConfigManifestFromAr.manifestRefreshInterval = 0;
      let arServiceSpy = jest
        .spyOn(ArweaveService.prototype, "getCurrentManifest")
        .mockResolvedValueOnce(manifest)
        .mockRejectedValue("timeout");

      const sut = await NodeRunner.create(nodeConfigManifestFromAr);

      await sut.run();

      expect(sut).not.toBeNull();
      expect(ArweaveService.prototype.getCurrentManifest).toHaveBeenCalledTimes(
        2
      );
      expect(fetchers.uniswap.fetchAll).toHaveBeenCalled();
      expect(axios.post).toHaveBeenCalledWith(broadcastingUrl, any());
      arServiceSpy.mockClear();
    });
  });
});
