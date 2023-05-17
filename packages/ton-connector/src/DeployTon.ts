import { Ton } from "./Ton";
import { TonClient } from "ton";
import { Sender } from "ton-core";
import Counter from "./Counter";

export class DeployTon extends Ton {
  override async perform(): Promise<any> {
    await this.connect();

    await this.wait(() => {
      this.deploy(this.client!, this.walletSender!);
    });

    return undefined;
  }

  private async deploy(client: TonClient, sender: Sender) {
    const counter = Counter.createForDeploy();

    // exit if contract is already deployed
    console.log("contract address:", counter.address.toString());
    if (await client.isContractDeployed(counter.address)) {
      return console.log("Counter already deployed");
    }

    // send the deploy transaction
    const counterContract = client.open(counter);

    await counterContract.sendDeploy(sender);
  }
}
