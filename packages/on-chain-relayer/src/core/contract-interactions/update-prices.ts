import { TransactionResponse } from "@ethersproject/providers";
import { config } from "../../config";
import {
  MentoContracts,
  prepareLinkedListLocationsForMentoAdapterReport,
} from "../../custom-integrations/mento/mento-utils";

import { getSortedOraclesContractAtAddress } from "./get-contract";
import { TransactionDeliveryMan } from "redstone-rpc-providers";
import { UpdatePricesArgs } from "../../args/get-update-prices-args";

let deliveryMan: TransactionDeliveryMan | undefined = undefined;
const getDeliveryManager = () => {
  deliveryMan =
    deliveryMan ??
    new TransactionDeliveryMan({
      expectedDeliveryTimeMs: config().expectedTxDeliveryTimeInMS,
    });
  return deliveryMan;
};

export const updatePrices = async (updatePricesArgs: UpdatePricesArgs) => {
  const updateTx = await updatePriceInAdapterContract(updatePricesArgs);
  console.log(`Update prices tx sent: ${updateTx.hash}`);
  await updateTx.wait();
  console.log(`Successfully updated prices: ${updateTx.hash}`);
};

const updatePriceInAdapterContract = async (
  args: UpdatePricesArgs
): Promise<TransactionResponse> => {
  switch (config().adapterContractType) {
    case "price-feeds":
      return await updatePricesInPriceFeedsAdapter(args);
    case "mento":
      return await updatePricesInMentoAdapter(args);
    default:
      throw new Error(
        `Unsupported adapter contract type: ${config().adapterContractType}`
      );
  }
};

const updatePricesInPriceFeedsAdapter = async ({
  adapterContract,
  wrapContract,
  proposedTimestamp,
}: UpdatePricesArgs): Promise<TransactionResponse> => {
  const wrappedContract = wrapContract(adapterContract);

  const deliveryResult = await getDeliveryManager().deliver(
    wrappedContract,
    "updateDataFeedsValues",
    [proposedTimestamp],
    config().gasLimit ? Number(config().gasLimit) : undefined
  );

  return deliveryResult;
};

const updatePricesInMentoAdapter = async ({
  adapterContract,
  wrapContract,
  proposedTimestamp,
}: UpdatePricesArgs): Promise<TransactionResponse> => {
  const sortedOraclesAddress = await adapterContract.sortedOracles();
  const sortedOracles = getSortedOraclesContractAtAddress(sortedOraclesAddress);
  const linkedListPositions =
    await prepareLinkedListLocationsForMentoAdapterReport({
      mentoAdapter: adapterContract,
      wrapContract,
      sortedOracles,
    } as MentoContracts);
  return await wrapContract(
    adapterContract
  ).updatePriceValuesAndCleanOldReports(proposedTimestamp, linkedListPositions);
};
