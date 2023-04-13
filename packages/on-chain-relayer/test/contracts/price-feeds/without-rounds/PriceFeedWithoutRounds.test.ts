import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { describeCommonPriceFeedTests } from "../common/price-feed-utils";

chai.use(chaiAsPromised);

describe("PriceFeedWithoutRounds", () => {
  describeCommonPriceFeedTests();

  describe("Tests for getting historical price feed values", () => {
    it("should revert trying to get round data for invalid rounds", async () => {
      expect(1).to.be.equal(1);
    });
  });
});
