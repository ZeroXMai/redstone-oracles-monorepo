import { BigNumber } from "ethers";
import { DataPackagesResponse } from "redstone-sdk";
import { IRedstoneAdapter } from "../typechain-types";

export interface ValuesForDataFeeds {
  [dataFeedId: string]: BigNumber;
}

export interface Context {
  dataPackages: DataPackagesResponse;
  adapterContract: IRedstoneAdapter;
  lastUpdateTimestamp: number;
}

export interface ConditionCheckResponse {
  shouldUpdatePrices: boolean;
  warningMessage: string;
}

export type ConditionChecksNames = "time" | "value-deviation";
