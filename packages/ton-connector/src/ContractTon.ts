import { Ton } from "./Ton";
import { OpenedContract } from "ton";
import Counter from "./Counter";
import { Address } from "ton-core";

export class ContractTon extends Ton {
  counterContract?: OpenedContract<Counter>;

  constructor(protected address: string) {
    super();
  }

  async connect(): Promise<ContractTon> {
    await super.connect();

    const counterAddress = Address.parse(this.address); // replace with your address from step 8
    const counter = new Counter(counterAddress);

    this.counterContract = this.client!.open(counter);

    return this;
  }

  override async perform() {
    await this.connect();

    // await this.wait(() => {
    //   this.counterContract!.sendIncrement(this.walletSender!);
    // });

    return await this.counterContract?.getKey();
  }
}
