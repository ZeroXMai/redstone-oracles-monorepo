import {
  PriceDataAfterAggregation,
  PriceDataBeforeAggregation,
} from "../src/types";
import medianAggregator, {
  getMedianValue,
} from "../src/aggregators/median-aggregator";

describe("getMedianValue", () => {
  it("should throw for empty array", () => {
    expect(() => getMedianValue([])).toThrow();
  });

  it("should properly calculate median for odd number of elements", () => {
    expect(getMedianValue([3, 7, 2, 6, 5, 4, 9])).toEqual(5);
    expect(getMedianValue([-3, 0, 3])).toEqual(0);
    expect(getMedianValue([3, 0, -3])).toEqual(0);
    expect(getMedianValue([-7, -5, -11, -4, -8])).toEqual(-7);
  });

  it("should properly calculate median for even number of elements", () => {
    expect(getMedianValue([3, 7, 2, 6, 5, 4])).toEqual(4.5);
    expect(getMedianValue([-3, 0])).toEqual(-1.5);
    expect(getMedianValue([0, -3])).toEqual(-1.5);
    expect(getMedianValue([-7, -5, -4, -8])).toEqual(-6);
  });
});

describe("medianAggregator", () => {
  it("should properly aggregate prices from different sources", () => {
    // Given
    const input: PriceDataBeforeAggregation = {
      id: "",
      source: {
        src1: 3,
        src2: 7,
        src3: 2,
        src4: 6,
        src5: 5,
        src6: 9,
        src7: 8,
      },
      symbol: "BTC",
      timestamp: 0,
      version: "",
    };

    // When
    const result: PriceDataAfterAggregation =
      medianAggregator.getAggregatedValue(input);

    // Then
    expect(result.value).toEqual(6);
  });
});
