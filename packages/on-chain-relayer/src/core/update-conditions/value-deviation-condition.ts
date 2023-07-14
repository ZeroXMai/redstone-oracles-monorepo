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

  let olderShouldUpdatePrices = false;
  let olderWarningMessage = "";

  if (shouldUpdatePrices && (config.fallbackOffsetInMinutes ?? 0) > 0) {
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
    warningMessage: `Fallback deviation: ${warningMessage}${olderWarningMessage}`,
  };
};
