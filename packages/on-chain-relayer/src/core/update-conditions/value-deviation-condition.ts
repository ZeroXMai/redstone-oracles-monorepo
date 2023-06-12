import { INumericDataPoint } from "redstone-protocol";
import { DataPackagesResponse } from "redstone-sdk";
import { config } from "../../config";
import { formatUnits } from "ethers/lib/utils";
import { getValuesForDataFeedsFromContract } from "../contract-interactions/get-values-for-data-feeds-from-contract";
import { IRedstoneAdapter } from "../../../typechain-types";

const DEFAULT_DECIMALS = 8;

export const valueDeviationCondition = async (
  dataPackages: DataPackagesResponse,
  adapterContract: IRedstoneAdapter
) => {
  const dataFeedsIds = Object.keys(dataPackages);
  const valuesFromContract = await getValuesForDataFeedsFromContract(
    adapterContract,
    dataFeedsIds
  );

  let maxDeviation = 0;
  for (const dataFeedId of dataFeedsIds) {
    for (const { dataPackage } of dataPackages[dataFeedId]) {
      for (const dataPoint of dataPackage.dataPoints) {
        const valueFromContract = valuesFromContract[dataFeedId];
        const dataPointObj = dataPoint.toObj() as INumericDataPoint;
        const valueFromContractAsDecimal = Number(
          formatUnits(
            (valueFromContract ?? 0).toString(),
            dataPointObj.decimals ?? DEFAULT_DECIMALS
          )
        );

        const currentDeviation = calculateDeviation(
          dataPointObj.value,
          valueFromContractAsDecimal
        );
        maxDeviation = Math.max(currentDeviation, maxDeviation);
      }
    }
  }

  const { minDeviationPercentage } = config;
  const shouldUpdatePrices = maxDeviation >= minDeviationPercentage;

  return {
    shouldUpdatePrices,
    warningMessage: shouldUpdatePrices
      ? ""
      : "Value has not deviated enough to be updated",
  };
};

const calculateDeviation = (
  valueFromFetchedDataPackage: number,
  valueFromContract: number
) => {
  const pricesDiff = Math.abs(valueFromContract - valueFromFetchedDataPackage);

  if (valueFromContract === 0) {
    return Number.MAX_SAFE_INTEGER;
  }

  return (pricesDiff * 100) / valueFromContract;
};
