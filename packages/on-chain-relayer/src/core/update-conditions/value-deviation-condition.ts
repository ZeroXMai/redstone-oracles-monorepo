import { RelayerConfig } from "../../types";
import { DataPackagesResponse, ValuesForDataFeeds } from "redstone-sdk";
import { checkValueDeviationCondition } from "./check-value-deviation-condition";

export const valueDeviationCondition = async (
  latestDataPackages: DataPackagesResponse,
  olderDataPackagesPromise: Promise<DataPackagesResponse>,
  valuesFromContract: ValuesForDataFeeds,
  config: RelayerConfig
) => {
  const { shouldUpdatePrices, warningMessage } = checkValueDeviationCondition(
    latestDataPackages,
    valuesFromContract,
    config
  );

  const isFallback = (config.fallbackOffsetInMinutes ?? 0) > 0;
  let olderShouldUpdatePrices = true;
  let olderWarningMessage = "";

  if (shouldUpdatePrices && isFallback) {
    const olderDataPackages = await olderDataPackagesPromise;

    const {
      shouldUpdatePrices: olderShouldUpdatePricesTmp,
      warningMessage: olderWarningMessageTmp,
    } = checkValueDeviationCondition(
      olderDataPackages,
      valuesFromContract,
      config
    );

    olderShouldUpdatePrices = olderShouldUpdatePricesTmp;
    olderWarningMessage = ` AND Older ${olderWarningMessageTmp}`;
  }

  return {
    shouldUpdatePrices: shouldUpdatePrices && olderShouldUpdatePrices,
    warningMessage: `${
      isFallback ? "Fallback deviation: " : ""
    }${warningMessage}${olderWarningMessage}`,
  };
};
