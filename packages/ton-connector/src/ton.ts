import { config } from "./config";

import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, WalletContractV4, OpenedContract } from "ton";
import Counter from "./counter";
import { Address, Sender } from "ton-core";

async function main() {
  // open wallet v4 (notice the correct wallet version here)
  const key = await mnemonicToWalletKey(config.mnemonic);
  const wallet = WalletContractV4.create({
    publicKey: key.publicKey,
    workchain: 0,
  });

  // initialize ton rpc client on testnet
  const endpoint = await getHttpEndpoint({ network: "testnet" });
  const client = new TonClient({ endpoint });

  const walletContract = client.open(wallet);
  const walletSender = walletContract.sender(key.secretKey);

  // make sure wallet is deployed
  if (!(await client.isContractDeployed(wallet.address))) {
    return console.log("wallet is not deployed");
  }

  await wait(walletContract, () => {
    deploy(client, walletSender);
  });

  // open Counter instance by address
  const counterAddress = Address.parse(
    "EQAOpcyRDCEMXCfqubfID8pU1BNkHisT-paDyIzIG5H7pJzd"
  ); // replace with your address from step 8
  const counter = new Counter(counterAddress);
  const counterContract = client.open(counter);

  let counterValue = await counterContract.getCounter();
  console.log("value:", counterValue.toString());

  await wait(walletContract, () => {
    counterContract.sendIncrement(walletSender);
  });

  // call the getter on chain
  counterValue = await counterContract.getCounter();
  console.log("value:", counterValue.toString());
}

main();

async function wait(
  walletContract: OpenedContract<WalletContractV4>,
  callback: () => void
): Promise<void> {
  const seqno = await walletContract.getSeqno();

  await callback();

  // wait until confirmed
  let currentSeqno = seqno;
  while (currentSeqno == seqno) {
    console.log("waiting for transaction to confirm...");
    await sleep(1500);
    currentSeqno = await walletContract.getSeqno();
  }
  console.log("transaction confirmed!");
}

async function deploy(client: TonClient, sender: Sender) {
  const initialCounterValue = Date.now(); // to avoid collisions use current number of milliseconds since epoch as initial value
  const counter = Counter.createForDeploy(initialCounterValue);

  // exit if contract is already deployed
  console.log("contract address:", counter.address.toString());
  if (await client.isContractDeployed(counter.address)) {
    return console.log("Counter already deployed");
  }

  // send the deploy transaction
  const counterContract = client.open(counter);

  await counterContract.sendDeploy(sender);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
