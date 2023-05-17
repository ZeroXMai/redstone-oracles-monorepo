import { DeployTon } from "./DeployTon";
import { ContractTon } from "./ContractTon";

async function main() {
  let argv = require("minimist")(process.argv.slice(2));

  switch (argv["deploy"]) {
    case 1:
      return await (await new DeployTon().connect()).perform();

    default:
      console.log(
        await (
          await new ContractTon(
            "EQDM4ScXfF2YITymKKX2z7oJ7ys4gPfSJNFdS-FrafB3PTj2"
          ).connect()
        ).perform()
      );
  }
}

main();
