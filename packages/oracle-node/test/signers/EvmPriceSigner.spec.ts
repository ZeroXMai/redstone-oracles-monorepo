import { ethers } from "ethers";
import EvmPriceSigner from "../../src/signers/EvmPriceSigner";
import { PricePackage, SignedPricePackage } from "../../src/types";
import { createSafeNumber } from "../../src/numbers/SafeNumberFactory";

const evmSigner = new EvmPriceSigner();
const ethereumPrivateKey = ethers.Wallet.createRandom().privateKey;

describe("evmSignPricesAndVerify", () => {
  jest.useFakeTimers().setSystemTime(new Date("2021-09-01").getTime());

  it("should sign price package", () => {
    // given
    const pricePackage: PricePackage = {
      prices: [
        {
          symbol: "XXX",
          value: 0.0054,
        },
        {
          symbol: "YYY",
          value: 100,
        },
        {
          symbol: "AAA",
          value: 20.003,
        },
      ],
      timestamp: Date.now(),
    };

    // when
    const signedPricesData: SignedPricePackage = evmSigner.signPricePackage(
      pricePackage,
      ethereumPrivateKey
    );

    // then
    expect(evmSigner.verifyLiteSignature(signedPricesData)).toEqual(true);
  });

  it("should fail verifying wrong lite signature", () => {
    // given
    const pricePackage: PricePackage = {
      prices: [
        {
          symbol: "XXX",
          value: 10,
        },
      ],
      timestamp: Date.now(),
    };
    const anotherPricesPackage = {
      ...pricePackage,
      timestamp: pricePackage.timestamp + 1000, // we add 1000 ms here because lite signature uses unix timestamp (in seconds)
    };

    // when
    const signedPricesData: SignedPricePackage = evmSigner.signPricePackage(
      pricePackage,
      ethereumPrivateKey
    );

    // then
    expect(
      evmSigner.verifyLiteSignature({
        ...signedPricesData,
        pricePackage: anotherPricesPackage,
      })
    ).toEqual(false);
  });

  it("should fail verifying lite signature for wrong eth address", () => {
    // given
    const pricePackage: PricePackage = {
      prices: [
        {
          symbol: "XXX",
          value: 10,
        },
      ],
      timestamp: Date.now(),
    };

    // when
    const signedPricesData: SignedPricePackage = evmSigner.signPricePackage(
      pricePackage,
      ethereumPrivateKey
    );

    // then
    expect(
      evmSigner.verifyLiteSignature({
        ...signedPricesData,
        signerAddress: "0x1111111111111111111111111111111111111111",
      })
    ).toEqual(false);
  });

  it("should sign and verify lite signature even for packages with different price order", () => {
    // given
    const pricePackage1: PricePackage = {
      prices: [
        {
          symbol: "FIRST",
          value: 1,
        },
        {
          symbol: "SECOND",
          value: 2,
        },
      ],
      timestamp: Date.now(),
    };

    const pricePackageWithDifferentOrder: PricePackage = {
      prices: [
        {
          symbol: "SECOND",
          value: 2,
        },
        {
          symbol: "FIRST",
          value: 1,
        },
      ],
      timestamp: Date.now(),
    };

    // when
    const signedPricesData: SignedPricePackage = evmSigner.signPricePackage(
      pricePackage1,
      ethereumPrivateKey
    );

    // then
    expect(
      evmSigner.verifyLiteSignature({
        ...signedPricesData,
        pricePackage: pricePackageWithDifferentOrder,
      })
    ).toEqual(true);
  });

  it("should fail to sign price package with where value is string", () => {
    const pricePackage1: PricePackage = {
      prices: [
        {
          symbol: "FIRST",
          value: "1.1" as unknown as number,
        },
        {
          symbol: "SECOND",
          value: "100023" as unknown as number,
        },
      ],
      timestamp: Date.now(),
    };
    expect(() =>
      evmSigner.signPricePackage(pricePackage1, ethereumPrivateKey)
    ).toThrow();
  });

  it("should fail to sign price package where value is ISafeNumber instance", () => {
    const pricePackage1: PricePackage = {
      prices: [
        {
          symbol: "FIRST",
          value: createSafeNumber("1.1") as unknown as number,
        },
        {
          symbol: "SECOND",
          value: createSafeNumber("100023") as unknown as number,
        },
      ],
      timestamp: Date.now(),
    };
    expect(() =>
      evmSigner.signPricePackage(pricePackage1, ethereumPrivateKey)
    ).toThrow();
  });
});
