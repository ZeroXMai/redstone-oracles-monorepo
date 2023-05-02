import { BigNumber, utils } from "ethers";
import { MulticallParsedResponses } from "../../../../types";
import {
  YieldYakDetailsKeys,
  LpTokensDetailsKeys,
  lpTokensIds,
  mooTokens,
  yyTokenIds,
  MooJoeTokensDetailsKeys,
  oracleAdaptersTokens,
  OracleAdaptersDetailsKeys,
  gmdTokens,
  GmdTokensDetailsKeys,
} from "./AvalancheEvmFetcher";
import { fetchTokenPrice, fetchTokensPrices } from "./fetch-token-price";
import { lpTokensContractsDetails } from "./contracts-details/lp-tokens";
import { yieldYakContractsDetails } from "./contracts-details/yield-yak";
import { mooTokensContractsDetails } from "./contracts-details/moo-joe";
import { oracleAdaptersContractsDetails } from "./contracts-details/oracle-adapters";
import { sqrt } from "../../../../utils/math";
import {
  extractValuesWithTheSameNameFromMulticall,
  extractPriceForGlpToken,
  extractValuesFromMulticallResponse,
} from "../../shared/extract-prices";
import { glpToken } from "../../shared/contracts-details/glp-manager";
import { glpManagerAddress } from "./contracts-details/glp-manager";
import { gmdTokensDetails } from "./contracts-details/gmd";

// Fair LP Token Pricing has been implemented with the help of: https://blog.alphaventuredao.io/fair-lp-token-pricing/

interface TokenReserve {
  [name: string]: BigNumber;
}

export const extractPrice = (
  response: MulticallParsedResponses,
  id: string
) => {
  if (yyTokenIds.includes(id)) {
    const { address } = yieldYakContractsDetails[id as YieldYakDetailsKeys];
    return extractPriceForYieldYakOrMoo(response, id, address, "totalDeposits");
  } else if (lpTokensIds.includes(id)) {
    return extractPriceForLpTokens(response, id);
  } else if (mooTokens.includes(id)) {
    const { address } =
      mooTokensContractsDetails[id as MooJoeTokensDetailsKeys];
    return extractPriceForYieldYakOrMoo(response, id, address, "balance");
  } else if (oracleAdaptersTokens.includes(id)) {
    return extractPriceForOracleAdapterTokens(response, id);
  } else if (glpToken.includes(id)) {
    return extractPriceForGlpToken(response, glpManagerAddress);
  } else if (gmdTokens.includes(id)) {
    return extractPriceForGmdToken(response, id);
  }
};

const extractPriceForYieldYakOrMoo = (
  multicallResult: MulticallParsedResponses,
  id: string,
  address: string,
  firstFunctionName: string,
  secondFunctionName: string = "totalSupply"
) => {
  const totalDeposits = BigNumber.from(
    extractValuesFromMulticallResponse(
      multicallResult,
      address,
      firstFunctionName
    )
  );
  const totalSupply = BigNumber.from(
    extractValuesFromMulticallResponse(
      multicallResult,
      address,
      secondFunctionName
    )
  );

  const tokenValue = totalDeposits
    .mul(utils.parseUnits("1.0", 8))
    .div(totalSupply);

  const tokenPrice = fetchTokenPrice(id);
  if (tokenPrice) {
    const yieldYakPrice = tokenValue
      .mul(tokenPrice)
      .div(utils.parseUnits("1.0", 8));

    return utils.formatEther(yieldYakPrice);
  }
};

const extractPriceForLpTokens = (
  multicallResult: MulticallParsedResponses,
  id: string
) => {
  const { address, tokensToFetch } =
    lpTokensContractsDetails[id as LpTokensDetailsKeys];
  const reserves = extractValuesFromMulticallResponse(
    multicallResult,
    address,
    "getReserves"
  );

  const firstTokenReserve = BigNumber.from(reserves.slice(0, 66));
  const firstToken = tokensToFetch[0];
  const secondTokenReserve = BigNumber.from(`0x${reserves.slice(66, 130)}`);
  const secondToken = tokensToFetch[1];
  const tokenReserves = {
    [firstToken]: firstTokenReserve,
    [secondToken]: secondTokenReserve,
  };

  const tokensReservesPrices = calculateReserveTokensPrices(tokenReserves);
  const reservesSerialized = serializeDecimals(tokenReserves);

  if (tokensReservesPrices) {
    const firstTokenReservePrice = tokensReservesPrices[firstToken];
    const secondTokenReservePrice = tokensReservesPrices[secondToken];

    const firstReserve = reservesSerialized[firstToken];
    const secondReserve = reservesSerialized[secondToken];

    const reservesMultiplied = firstReserve.mul(secondReserve);
    const pricesMultiplied = firstTokenReservePrice.mul(
      secondTokenReservePrice
    );

    const reservesMultipliedSqrt = sqrt(reservesMultiplied);
    const pricesMultipliedSqrt = sqrt(pricesMultiplied);

    const reservesPricesMulitplied =
      reservesMultipliedSqrt.mul(pricesMultipliedSqrt);

    const totalSupply = BigNumber.from(
      extractValuesFromMulticallResponse(
        multicallResult,
        address,
        "totalSupply"
      )
    );

    const lpTokenPrice = reservesPricesMulitplied.div(totalSupply).mul(2);

    return utils.formatEther(lpTokenPrice);
  }
};

const calculateReserveTokensPrices = (tokenReserves: TokenReserve) => {
  const tokenNames = Object.keys(tokenReserves);
  const tokensPrices = fetchTokensPrices(tokenNames);
  const areAllTokensFetched =
    Object.keys(tokensPrices).length === Object.keys(tokenReserves).length;
  if (areAllTokensFetched) {
    return tokensPrices;
  }
};

const serializeDecimals = (tokenReserves: TokenReserve) => {
  const serializedTokenReserves = {} as TokenReserve;
  for (const tokenName of Object.keys(tokenReserves)) {
    let tokenReserveSerialized = tokenReserves[tokenName];
    if (["USDC", "USDT"].includes(tokenName)) {
      tokenReserveSerialized = tokenReserves[tokenName].mul(
        utils.parseUnits("1.0", 12)
      );
    } else if (tokenName === "BTC") {
      tokenReserveSerialized = tokenReserves[tokenName].mul(
        utils.parseUnits("1.0", 10)
      );
    }
    serializedTokenReserves[tokenName] = tokenReserveSerialized;
  }
  return serializedTokenReserves;
};

const extractPriceForOracleAdapterTokens = (
  multicallResult: MulticallParsedResponses,
  id: string
) => {
  const { address } =
    oracleAdaptersContractsDetails[id as OracleAdaptersDetailsKeys];
  const latestAnswer = BigNumber.from(
    extractValuesFromMulticallResponse(multicallResult, address, "latestAnswer")
  );
  return utils.formatUnits(latestAnswer, 8);
};

const extractPriceForGmdToken = (
  multicallResult: MulticallParsedResponses,
  id: string
) => {
  const gmdTokenDetails = gmdTokensDetails[id as GmdTokensDetailsKeys];
  const totalSupply = BigNumber.from(
    extractValuesFromMulticallResponse(
      multicallResult,
      gmdTokenDetails.address,
      "totalSupply"
    )
  );
  const poolsInfo = extractValuesWithTheSameNameFromMulticall(
    multicallResult,
    gmdTokenDetails.vaultAddress,
    "poolInfo"
  );
  const poolInfo = poolsInfo.find(
    (poolInfo) =>
      `0x${poolInfo?.slice(90, 130)}` === gmdTokenDetails.address.toLowerCase()
  );
  if (poolInfo) {
    const totalStaked = BigNumber.from(`0x${poolInfo.slice(194, 258)}`);
    const ratio = totalStaked.mul(utils.parseUnits("1.0", 18)).div(totalSupply);
    const tokenToFetchPrice = fetchTokenPrice(id);
    if (tokenToFetchPrice) {
      const price = ratio.mul(tokenToFetchPrice);
      return utils.formatUnits(price, 36);
    }
  }
};
