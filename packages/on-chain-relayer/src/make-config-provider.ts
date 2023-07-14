import {
  ConditionCheckNames,
  OnChainRelayerEnv,
  OnChainRelayerManifest,
  RelayerConfig,
} from "./types";

export const makeConfigProvider = (
  manifest: OnChainRelayerManifest,
  env: OnChainRelayerEnv
): RelayerConfig => {
  const { timeSinceLastUpdateInMilliseconds, deviationPercentage } =
    manifest.updateTriggers;
  let updateConditions = [] as ConditionCheckNames[];

  if (deviationPercentage) {
    updateConditions.push("value-deviation");
  }

  if (timeSinceLastUpdateInMilliseconds) {
    updateConditions.push("time");
  }

  return Object.freeze({
    updatePriceInterval: timeSinceLastUpdateInMilliseconds,
    chainName: manifest.chain.name!,
    chainId: manifest.chain.id,
    adapterContractAddress: manifest.adapterContract,
    dataServiceId: manifest.dataServiceId,
    dataFeeds: Object.keys(manifest.priceFeeds),
    updateConditions: updateConditions,
    minDeviationPercentage: deviationPercentage,
    ...env,
  });
};
