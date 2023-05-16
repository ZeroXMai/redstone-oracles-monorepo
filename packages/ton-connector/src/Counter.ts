import {
  Contract,
  ContractProvider,
  Sender,
  Address,
  Cell,
  contractAddress,
  beginCell,
} from "ton-core";
import fs from "fs";

export default class Counter implements Contract {
  static createForDeploy(): Counter {
    const code = Cell.fromBoc(fs.readFileSync("func/counter.cell"))[0]; // compilation output from step 6

    const data = beginCell().endCell();
    const workchain = 0; // deploy to workchain 0
    const address = contractAddress(workchain, { code, data });
    return new Counter(address, { code, data });
  }

  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell }
  ) {}

  async sendDeploy(provider: ContractProvider, via: Sender) {
    await provider.internal(via, {
      value: "0.01", // send 0.01 TON to contract for rent
      bounce: false,
    });
  }

  async sendIncrement(provider: ContractProvider, via: Sender) {
    const messageBody = beginCell()
      .storeUint(1, 32) // op (op #1 = increment)
      .storeUint(0, 64) // query id
      .storeUint(333, 256)
      .storeUint(199994, 256)
      .endCell();
    await provider.internal(via, {
      value: "0.002", // send 0.002 TON for gas
      body: messageBody,
    });
  }

  async getKey(provider: ContractProvider) {
    const { stack } = await provider.get("get_key", [
      { type: "int", value: 333 as unknown as bigint },
    ]);

    return stack.readBigNumber();
  }
}
