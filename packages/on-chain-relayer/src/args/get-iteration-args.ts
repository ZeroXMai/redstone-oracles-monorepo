import { getLastRoundParamsFromContract } from "../core/contract-interactions/get-last-round-params";
import { ValuesForDataFeeds } from "redstone-sdk";
import { getValuesForDataFeeds } from "../core/contract-interactions/get-values-for-data-feeds";
import { shouldUpdate } from "../core/update-conditions/should-update";
import {
  getUpdatePricesArgs,
  UpdatePricesArgs,
} from "./get-update-prices-args";
import { IRedstoneAdapter } from "../../typechain-types";
import { config } from "../config";

import { fetchDataPackages } from "../core/fetch-data-packages";

export const getIterationArgs = async (
  adapterContract: IRedstoneAdapter
): Promise<{
  shouldUpdatePrices: boolean;
  args?: UpdatePricesArgs;
  message?: string;
}> => {
  const relayerConfig = config();
  const { dataFeeds, updateConditions } = relayerConfig;

  const { lastUpdateTimestamp } = await getLastRoundParamsFromContract(
    adapterContract
  );

  // We fetch latest values from contract only if we want to check value deviation
  const shouldCheckValueDeviation =
    updateConditions.includes("value-deviation");
  let valuesFromContract: ValuesForDataFeeds = {};
  if (shouldCheckValueDeviation) {
    valuesFromContract = await getValuesForDataFeeds(
      adapterContract,
      dataFeeds
    );
  }
  const dataPackages = await fetchDataPackages(
    relayerConfig,
    valuesFromContract
  );
  const olderDataPackagesPromise =
    shouldCheckValueDeviation &&
    (relayerConfig.fallbackOffsetInMinutes ?? 0) > 0
      ? fetchDataPackages(relayerConfig, valuesFromContract, true)
      : undefined;

  const { shouldUpdatePrices, warningMessage } = await shouldUpdate(
    {
      dataPackages,
      olderDataPackagesPromise,
      valuesFromContract,
      lastUpdateTimestamp,
    },
    relayerConfig
  );

  if (!shouldUpdatePrices) {
    return { shouldUpdatePrices, message: warningMessage };
  } else {
    const updatePricesArgs = await getUpdatePricesArgs(
      dataPackages,
      adapterContract,
      lastUpdateTimestamp
    );

    return {
      shouldUpdatePrices,
      ...updatePricesArgs,
      message: `${warningMessage}; ${updatePricesArgs.message || ""}`,
    };
  }
};
