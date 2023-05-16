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
            "EQAewcCIIGypol8u2g0ljMTXloB3sGs2gyPSm2_tPHbYZnSb"
          ).connect()
        ).perform()
      );
  }
}

main();
