import { AsyncTask, SimpleIntervalJob, ToadScheduler } from "toad-scheduler";
import { requestDataPackages } from "redstone-sdk";
import { shouldUpdate } from "./core/update-conditions/should-update";
import { updatePrices } from "./core/contract-interactions/update-prices";
import { getLastRoundParamsFromContract } from "./core/contract-interactions/get-last-round-params";
import { getAdapterContract } from "./core/contract-interactions/get-contract";
import { getValuesForDataFeeds } from "./core/contract-interactions/get-values-for-data-feeds";
import { sendHealthcheckPing } from "./core/monitoring/send-healthcheck-ping";
import { config } from "./config";

const { relayerIterationInterval } = config;

console.log(
  `Starting contract prices updater with interval ${relayerIterationInterval}`
);

const runIteration = async () => {
  const { dataServiceId, uniqueSignersCount, dataFeeds, cacheServiceUrls } =
    config;
  const adapterContract = getAdapterContract();
  const dataPackages = await requestDataPackages(
    {
      dataServiceId,
      uniqueSignersCount,
      dataFeeds,
    },
    cacheServiceUrls
  );

  const { lastUpdateTimestamp } = await getLastRoundParamsFromContract(
    adapterContract
  );

  // We fetch latest values from contract only if we want to check value deviation
  let valuesFromContract = {};
  if (config.updateConditions.includes("value-deviation")) {
    valuesFromContract = await getValuesForDataFeeds(
      adapterContract,
      dataFeeds
    );
  }

  const { shouldUpdatePrices, warningMessage } = shouldUpdate({
    dataPackages,
    valuesFromContract,
    lastUpdateTimestamp,
  });

  if (!shouldUpdatePrices) {
    console.log(`All conditions are not fulfilled: ${warningMessage}`);
  } else {
    await updatePrices(dataPackages, adapterContract, lastUpdateTimestamp);
  }

  await sendHealthcheckPing();
};

const task = new AsyncTask(
  "Relayer task",
  () => runIteration(),
  (error) => console.log(error.stack)
);

const job = new SimpleIntervalJob(
  { milliseconds: relayerIterationInterval, runImmediately: true },
  task
);

const scheduler = new ToadScheduler();

scheduler.addSimpleIntervalJob(job);
