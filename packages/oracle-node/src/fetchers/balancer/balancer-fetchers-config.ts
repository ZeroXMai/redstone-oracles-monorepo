import { Network } from "@balancer-labs/sdk";
import { arbitrumProvider } from "../../utils/blockchain-providers";
import { config } from "../../config";

export const balancerFetchersConfig = {
  "balancer-dai": {
    pairedToken: "DAI",
    poolsConfigs: {
      OHM: {
        poolId:
          "0x76fcf0e8c7ff37a47a799fa2cd4c13cde0d981c90002000000000000000003d2",
        tokenIn: "0x6b175474e89094c44da98b954eedeac495271d0f",
        tokenOut: "0x64aa3364f17a4d01c6f1751fd97c2bd3d7e7f1d5",
      },
    },
  },
  "balancer-weth": {
    pairedToken: "ETH",
    poolsConfigs: {
      OHM: {
        poolId:
          "0xd1ec5e215e8148d76f4460e4097fd3d5ae0a35580002000000000000000003d3",
        tokenIn: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        tokenOut: "0x64aa3364f17a4d01c6f1751fd97c2bd3d7e7f1d5",
      },
      "BB-A-WETH": {
        poolId:
          "0x60d604890feaa0b5460b28a424407c24fe89374a0000000000000000000004fc",
        tokenIn: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        tokenOut: "0x60d604890feaa0b5460b28a424407c24fe89374a",
      },
      WSTETH: {
        poolId:
          "0x36bf227d6bac96e2ab1ebb5492ecec69c691943f000200000000000000000316",
        tokenOut: "0x5979d7b546e38e414f7e9822514be443a4800529",
        tokenIn: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        networkConfig: {
          network: Network.ARBITRUM,
          rpcUrl: config.arbitrumRpcUrls[0],
        },
      },
    },
  },
  "balancer-bb-a-weth-using-eth": {
    pairedToken: "ETH",
    poolsConfigs: {
      SWETH: {
        poolId:
          "0x02d928e68d8f10c0358566152677db51e1e2dc8c00000000000000000000051e",
        tokenIn: "0x60d604890feaa0b5460b28a424407c24fe89374a",
        tokenOut: "0xf951e335afb289353dc249e82926178eac7ded78",
      },
    },
  },
  "balancer-bb-a-weth": {
    pairedToken: "BB-A-WETH",
    poolsConfigs: {
      SWETH: {
        poolId:
          "0x02d928e68d8f10c0358566152677db51e1e2dc8c00000000000000000000051e",
        tokenIn: "0x60d604890feaa0b5460b28a424407c24fe89374a",
        tokenOut: "0xf951e335afb289353dc249e82926178eac7ded78",
      },
    },
  },
};
