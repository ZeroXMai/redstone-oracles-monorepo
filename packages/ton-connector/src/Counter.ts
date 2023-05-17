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
      .storeUint(0, 64); // query id

    for (let i = 0; i < 4; i++) {
      const cell = beginCell()
        .storeUint((i + 1) * 111, 256)
        .storeUint((i + 1) * 100000, 256)
        .endCell();
      messageBody.storeRef(cell);
    }

    const body = messageBody.endCell();

    await provider.internal(via, {
      value: "0.02", // send 0.02 TON for gas
      body,
    });
  }

  async getKey(provider: ContractProvider) {
    const { stack } = await provider.get("get_key", [
      { type: "int", value: 444 as unknown as bigint },
    ]);

    return stack.readBigNumber();
  }
}
