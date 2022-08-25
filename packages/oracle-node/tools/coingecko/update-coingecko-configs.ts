import CoingeckoApi from "coingecko-api";
import _ from "lodash";
import { readJSON, saveJSON } from "../common/fs-utils";
import { SYMBOL_TO_DETAILS_PATH, SYMBOL_TO_ID_PATH } from "./coingecko-common";

interface SymbolToDetails {
  [symbol: string]: [{ id: string; name: string }];
}

const HARDCODED_SYMBOLS = {
  QI: "benqi",
  SOS: "opendao",
  ONE: "harmony",
};

main();

async function main() {
  await updateSymbolToDetailsConfig();
  updateSymbolToIdConfig();
  console.log("\nDone!");
}

async function updateSymbolToDetailsConfig() {
  console.log(`Updating symbol->details config...`);

  const coingecko = new CoingeckoApi();

  const coins = (await coingecko.coins.all()).data;

  const symbolToDetails: SymbolToDetails = {};

  for (const coin of coins) {
    const symbol = coin.symbol.toUpperCase();
    const details = _.pick(coin, ["id", "name"]);
    if (symbolToDetails[symbol] === undefined) {
      symbolToDetails[symbol] = [details];
    } else {
      symbolToDetails[symbol].push(details);
    }
  }

  saveJSON(symbolToDetails, SYMBOL_TO_DETAILS_PATH);
}

function updateSymbolToIdConfig() {
  console.log(`Updating symbol->id config...`);

  const symbolToDetails: SymbolToDetails = readJSON(SYMBOL_TO_DETAILS_PATH);
  const symbolToIdConfig = readJSON(SYMBOL_TO_ID_PATH);

  const newSymbolToIdConfig = { ...symbolToIdConfig };

  for (const [symbol, details] of Object.entries(symbolToDetails)) {
    if (!newSymbolToIdConfig[symbol] && details && details.length === 1) {
      console.log(`Adding a new token: ${symbol}`);
      newSymbolToIdConfig[symbol] = details[0].id;
    }
  }

  saveJSON({ ...newSymbolToIdConfig, ...HARDCODED_SYMBOLS }, SYMBOL_TO_ID_PATH);
}
