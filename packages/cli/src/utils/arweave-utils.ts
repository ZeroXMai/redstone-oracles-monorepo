import Arweave from "arweave";
import fs from "fs";
import { ArWallet, WarpFactory } from "warp-contracts";
import deployedContracts from "redstone-oracles-smartweave-contracts/deployed-contracts.json";

const oracleRegistryContractId = deployedContracts["oracle-registry"];

export const getWallet = (walletPath: string) => {
  const rawWallet = fs.readFileSync(walletPath, "utf-8");
  return JSON.parse(rawWallet);
};

export const getContract = (contractId: string) => {
  return WarpFactory.forMainnet().contract(contractId);
};

export const connectWalletToContract = (wallet: ArWallet) => {
  const contract = getContract(oracleRegistryContractId);
  return contract.connect(wallet);
};

export const getOracleRegistryContract = (walletPath: string) => {
  const wallet = getWallet(walletPath);
  return connectWalletToContract(wallet);
};
