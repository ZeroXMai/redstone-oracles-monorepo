import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { WrapperBuilder } from "@redstone-finance/evm-connector";
import { IRedstoneAdapter } from "../../../../typechain-types";
import { formatBytes32String } from "ethers/lib/utils";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";
import { SimpleNumericMockConfig } from "@redstone-finance/evm-connector/dist/src/wrappers/SimpleMockNumericWrapper";
import { convertStringToBytes32 } from "redstone-protocol/src/common/utils";

interface AdapterTestsParams {
  adapterContractName: string;
  hasOnlyOneDataFeed: boolean;
  skipTestsForPrevDataTimestamp: boolean;
  passProposedTimestampArg: boolean;
}

interface UpdateValuesParams {
  increaseBlockTimeBySeconds: number;
  calculateMockDataTimestamp?: (blockTimestamp: number) => number;
  mockWrapperConfig?: SimpleNumericMockConfig;
}

interface ValidateValuesAndTimestampsParams {
  expectedLatestBlockTimestamp: number;
  expectedLatestDataTimestamp: number;
  expectedValues: { [dataFeedId: string]: number };
}

chai.use(chaiAsPromised);

export const describeCommonPriceFeedsAdapterTests = ({
  adapterContractName,
  hasOnlyOneDataFeed,
  skipTestsForPrevDataTimestamp,
  passProposedTimestampArg
}: AdapterTestsParams) => {
  let adapterContract: IRedstoneAdapter;

  const defaultMockWrapperConfig: SimpleNumericMockConfig = {
    dataPoints: [{ dataFeedId: "BTC", value: 42 }],
    mockSignersCount: 2,
  };

  const updateValues = async (args: UpdateValuesParams) => {
    const mockBlockTimestamp =
      (await time.latest()) + args.increaseBlockTimeBySeconds;
    const mockDataTimestamp = args.calculateMockDataTimestamp
      ? args.calculateMockDataTimestamp(mockBlockTimestamp)
      : mockBlockTimestamp * 1000;

    // Wrap it with Redstone payload
    const wrappedContract = WrapperBuilder.wrap(
      adapterContract
    ).usingSimpleNumericMock({
      timestampMilliseconds: mockDataTimestamp,
      ...(args.mockWrapperConfig || defaultMockWrapperConfig),
    }) as IRedstoneAdapter;

    // Update one data feed
    await time.setNextBlockTimestamp(mockBlockTimestamp);
    const tx = await wrappedContract.updateDataFeedsValues(mockDataTimestamp);
    await tx.wait();

    return {
      mockBlockTimestamp,
      mockDataTimestamp,
      tx,
      wrappedContract,
    };
  };

  const validateValuesAndTimestamps = async (
    args: ValidateValuesAndTimestampsParams
  ) => {
    // Validating values
    const dataFeedIds = Object.keys(args.expectedValues);
    const dataFeedIdsBytes32 = dataFeedIds.map(convertStringToBytes32);
    const values = await adapterContract.getValuesForDataFeeds(
      dataFeedIdsBytes32
    );
    for (let i = 0; i < values.length; i++) {
      const expectedValue = args.expectedValues[dataFeedIds[i]];
      expect(values[i].toNumber()).to.eq(expectedValue * 10 ** 8);
    }

    // Validating timestamps
    const timestamps = await adapterContract.getTimestampsFromLatestUpdate();
    expect(timestamps.blockTimestamp.toNumber()).to.eq(
      args.expectedLatestBlockTimestamp
    );

    if (!skipTestsForPrevDataTimestamp) {
      expect(timestamps.dataTimestamp.toNumber()).to.eq(
        args.expectedLatestDataTimestamp
      );
    }
  };

  beforeEach(async () => {
    // Deploy a new adapter contract
    const adapterContractFactory = await ethers.getContractFactory(
      adapterContractName
    );
    adapterContract =
      (await adapterContractFactory.deploy()) as IRedstoneAdapter;
  });

  it("should properly initialize", async () => {
    expect(1).to.be.equal(1);
  });

  it("should return an empty list of data feeds", async () => {
    expect(1).to.be.equal(1);
  });

  it("should properly upgrade the contract (change data feeds)", async () => {
    expect(1).to.be.equal(1);
  });

  it("should properly upgrade the contract (change authorised updaters)", async () => {
    expect(1).to.be.equal(1);
  });

  it("should properly get indexes for data feeds", async () => {
    // TODO: implement more tests here

    const btcDataFeedIndex = await adapterContract.getDataFeedIndex(
      formatBytes32String("BTC")
    );
    await expect(btcDataFeedIndex.toNumber()).to.eq(0);
  });

  it("should revert trying to get index if data feed is not supported", async () => {
    await expect(
      adapterContract.getDataFeedIndex(formatBytes32String("BAD_SYMBOL"))
    ).to.be.revertedWith("DataFeedIdNotFound");
  });

  it("should revert trying to update by unauthorised updater", async () => {
    expect(1).to.be.equal(1);
  });

  it("should revert if min interval hasn't passed", async () => {
    await updateValues({ increaseBlockTimeBySeconds: 1 });

    await expect(
      updateValues({ increaseBlockTimeBySeconds: 2 })
    ).to.be.revertedWith("MinIntervalBetweenUpdatesHasNotPassedYet");
  });

  if (!skipTestsForPrevDataTimestamp) {
    it("should revert if proposed data package timestamp is same as before", async () => {
      const { mockDataTimestamp } = await updateValues({
        increaseBlockTimeBySeconds: 1,
      });

      await expect(
        updateValues({
          increaseBlockTimeBySeconds: 5,
          calculateMockDataTimestamp: () => mockDataTimestamp,
        })
      ).to.be.revertedWith("DataTimestampShouldBeNewerThanBefore");
    });

    it("should revert if proposed data package timestamp is older than before", async () => {
      const { mockDataTimestamp } = await updateValues({
        increaseBlockTimeBySeconds: 1,
      });

      await expect(
        updateValues({
          increaseBlockTimeBySeconds: 5,
          calculateMockDataTimestamp: () => mockDataTimestamp - 1,
        })
      ).to.be.revertedWith("DataTimestampShouldBeNewerThanBefore");
    });
  }

  it("should revert if proposed data package timestamp is too old", async () => {
    await expect(
      updateValues({
        increaseBlockTimeBySeconds: 1,
        calculateMockDataTimestamp: (blockTimestamp) =>
          (blockTimestamp - 4 * 60) * 1000,
      })
    ).to.be.revertedWith("TimestampIsTooOld");
  });

  it("should revert if proposed data package timestamp is too new", async () => {
    await expect(
      updateValues({
        increaseBlockTimeBySeconds: 1,
        calculateMockDataTimestamp: (blockTimestamp) =>
          (blockTimestamp + 4 * 60) * 1000,
      })
    ).to.be.revertedWith("TimestampFromTooLongFuture");
  });

  it("should revert if at least one timestamp isn't equal to proposed timestamp", async () => {
    const latestBlockTimestamp = await time.latest();
    await expect(
      updateValues({
        increaseBlockTimeBySeconds: 1,
        mockWrapperConfig: {
          dataPoints: [{ dataFeedId: "NON-BTC", value: 42 }],
          mockSignersCount: 2,
          timestampMilliseconds: latestBlockTimestamp * 1000,
        },
      })
    ).to.be.revertedWith("DataPackageTimestampMismatch");
  });

  it("should revert if redstone payload is not attached", async () => {
    const mockBlockTimestamp = (await time.latest()) + 1;
    await expect(
      adapterContract.updateDataFeedsValues(mockBlockTimestamp * 1000)
    ).to.be.revertedWith("CalldataMustHaveValidPayload");
  });

  it("should revert if a data feed is missed in redstone payload", async () => {
    await expect(
      updateValues({
        increaseBlockTimeBySeconds: 1,
        mockWrapperConfig: {
          dataPoints: [{ dataFeedId: "NON-BTC", value: 42 }],
          mockSignersCount: 2,
        },
      })
    ).to.be.revertedWith("InsufficientNumberOfUniqueSigners(0, 2)");
  });

  it("should revert for too few signers", async () => {
    await expect(
      updateValues({
        increaseBlockTimeBySeconds: 1,
        mockWrapperConfig: {
          dataPoints: [{ dataFeedId: "BTC", value: 42 }],
          mockSignersCount: 1,
        },
      })
    ).to.be.revertedWith("InsufficientNumberOfUniqueSigners(1, 2)");
  });

  it("should properly update data feeds one time", async () => {
    const { mockBlockTimestamp, mockDataTimestamp } = await updateValues({
      increaseBlockTimeBySeconds: 1,
    });

    await validateValuesAndTimestamps({
      expectedLatestBlockTimestamp: mockBlockTimestamp,
      expectedLatestDataTimestamp: mockDataTimestamp,
      expectedValues: { BTC: 42 },
    });
  });

  it("should properly update data feeds with extra data feeds in payload", async () => {
    const { mockBlockTimestamp, mockDataTimestamp } = await updateValues({
      increaseBlockTimeBySeconds: 1,
      mockWrapperConfig: {
        dataPoints: [
          { dataFeedId: "NON-BTC", value: 422 },
          { dataFeedId: "BTC", value: 42 },
          { dataFeedId: "NON-BTC-2", value: 123 },
        ],
        mockSignersCount: 2,
      },
    });

    await validateValuesAndTimestamps({
      expectedLatestBlockTimestamp: mockBlockTimestamp,
      expectedLatestDataTimestamp: mockDataTimestamp,
      expectedValues: { BTC: 42 },
    });
  });

  it("should properly update data feeds several times", async () => {
    const updatesCount = 5;

    for (let i = 1; i <= updatesCount; i++) {
      const btcMockValue = i * 100;

      const { mockDataTimestamp, mockBlockTimestamp } = await updateValues({
        increaseBlockTimeBySeconds: i * 10,
        calculateMockDataTimestamp: (blockTimestamp) =>
          (blockTimestamp - 1) * 1000,
        mockWrapperConfig: {
          mockSignersCount: 2,
          dataPoints: [{ dataFeedId: "BTC", value: btcMockValue }],
        },
      });

      await validateValuesAndTimestamps({
        expectedLatestBlockTimestamp: mockBlockTimestamp,
        expectedLatestDataTimestamp: mockDataTimestamp,
        expectedValues: { BTC: btcMockValue },
      });
    }
  });

  it("should get a single data feed value", async () => {
    await updateValues({
      increaseBlockTimeBySeconds: 1,
    });
    const value = await adapterContract.getValueForDataFeed(
      convertStringToBytes32("BTC")
    );
    expect(value.toNumber()).to.be.equal(42 * 10 ** 8);
  });

  if (!hasOnlyOneDataFeed) {
    it("should get several data feed values", async () => {
      await updateValues({
        increaseBlockTimeBySeconds: 1,
      });

      const values = await adapterContract.getValuesForDataFeeds([
        convertStringToBytes32("BTC"),
      ]);
      expect(values.length).to.equal(1);
      expect(values[0].toNumber()).to.equal(42 * 10 ** 8);
    });
  }

  it("should revert trying to get invalid (zero) data feed value", async () => {
    await expect(
      adapterContract.getValueForDataFeed(convertStringToBytes32("BTC"))
    ).to.be.revertedWith("DataFeedValueCannotBeZero");
  });

  it("should revert trying to get a value for an unsupported data feed", async () => {
    await expect(
      adapterContract.getValueForDataFeed(convertStringToBytes32("SMTH-ELSE"))
    ).to.be.revertedWith("DataFeedIdNotFound");
  });

  it("should revert trying to get several values, if one data feed is not supported", async () => {
    await updateValues({
      increaseBlockTimeBySeconds: 1,
    });

    await expect(
      adapterContract.getValuesForDataFeeds(
        ["BTC", "SMTH-ELSE"].map(convertStringToBytes32)
      )
    ).to.be.revertedWith("DataFeedIdNotFound");
  });

  it("should revert trying to get several values, if one data feed has invalid (zero) value", async () => {
    await expect(
      adapterContract.getValuesForDataFeeds(["BTC"].map(convertStringToBytes32))
    ).to.be.revertedWith("DataFeedValueCannotBeZero");
  });
};
