import { expect } from "chai";
import { valueDeviationCondition } from "../../src/core/update-conditions/value-deviation-condition";
import { getValuesForDataFeedsFromContract } from "../../src/core/contract-interactions/get-values-for-data-feeds-from-contract";
import {
  createNumberFromContract,
  getDataPackagesResponse,
  mockEnvVariables,
} from "../helpers";
import { ValuesForDataFeeds } from "../../src/types";
import { IRedstoneAdapter } from "../../typechain-types";

describe("value-deviation-condition", () => {
  before(() => {
    mockEnvVariables();
  });

  it("should return false if value diff smaller than expected", async () => {
    const dataPackages = await getDataPackagesResponse();
    const smallerValueDiff: ValuesForDataFeeds = {
      ETH: createNumberFromContract(1630.99),
      BTC: createNumberFromContract(23011.68),
    };
    mockGetValuesFromContract(smallerValueDiff);

    const { shouldUpdatePrices, warningMessage } =
      await valueDeviationCondition(dataPackages, {} as IRedstoneAdapter);
    expect(shouldUpdatePrices).to.be.false;
    expect(warningMessage).to.be.equal(
      "Value has not deviated enough to be updated"
    );
  });

  it("should return true if value diff bigger than expected", async () => {
    const dataPackages = await getDataPackagesResponse();
    const biggerValueDiff: ValuesForDataFeeds = {
      ETH: createNumberFromContract(1230.99),
      BTC: createNumberFromContract(13011.68),
    };
    mockGetValuesFromContract(biggerValueDiff);

    const { shouldUpdatePrices, warningMessage } =
      await valueDeviationCondition(dataPackages, {} as IRedstoneAdapter);
    expect(shouldUpdatePrices).to.be.true;
    expect(warningMessage).to.be.equal("");
  });
});

const mockGetValuesFromContract = (values: ValuesForDataFeeds) =>
  ((getValuesForDataFeedsFromContract as {}) = () => values);
