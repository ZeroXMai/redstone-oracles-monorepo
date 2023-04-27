import { arrayify, hexlify, toUtf8Bytes, toUtf8String } from "ethers/lib/utils";
import {
  DataPackage,
  SignedDataPackage,
  NumericDataPoint,
  RedstonePayloadSingleSign,
  RedstonePayloadMultiSign,
  MultiSignDataPackage,
} from "../src";
import { hexlifyWithout0xPrefix } from "../src/common/utils";

const TIMESTAMP_FOR_TESTS = 1654353400000;
const UNSIGNED_METADATA = "1.1.2#test-data-feed";
const EXPECTED_UNSIGNED_METADATA_BYTE_SIZE = "000016"; // 20 in hex
const REDSTONE_MARKER = "000002ed57011e0000";
const PRIVATE_KEY_FOR_TESTS_1 =
  "0x1111111111111111111111111111111111111111111111111111111111111111";
const PRIVATE_KEY_FOR_TESTS_2 =
  "0x2222222222222222222222222222222222222222222222222222222222222222";
const EXPECTED_SERIALIZED_DATA_PACKAGE =
  "4254430000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003d1e382100045544800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002e90edd00001812f2590c000000020000002";
const EXPECTED_SIGNATURES = [
  "c1296a449f5d353c8b04eb389f33a583ee79449cca6e366900042f19f2521e722a410929223231905839c00865af68738f1a202478d87dc33675ea5824f343901b",
  "dbbf8a0e6b1c9a56a4a0ef7089ef2a3f74fbd21fbd5c7c8192b70084004b4f6d37427507c4fff835f74fd4d000b6830ed296e207f49831b96f90a4f4e60820ee1c",
];

describe("Fixed size data package", () => {
  let dataPackage: DataPackage;
  let signedDataPackages: SignedDataPackage[];
  let multiSignedDataPackage: MultiSignDataPackage;

  beforeEach(() => {
    // Prepare data points
    const dataPoints = [
      { dataFeedId: "BTC", value: 42000 },
      { dataFeedId: "ETH", value: 2000 },
    ].map(
      ({ dataFeedId, value }) => new NumericDataPoint({ dataFeedId, value })
    );

    // Prepare unsigned data package
    dataPackage = new DataPackage(dataPoints, TIMESTAMP_FOR_TESTS);

    // Prepare signed data packages
    signedDataPackages = [
      dataPackage.sign(PRIVATE_KEY_FOR_TESTS_1),
      dataPackage.sign(PRIVATE_KEY_FOR_TESTS_2),
    ];

    // Prepare multi-signed data packages
    multiSignedDataPackage = dataPackage.multiSign([
      PRIVATE_KEY_FOR_TESTS_1,
      PRIVATE_KEY_FOR_TESTS_2,
    ]);
  });

  test("Should correctly serialize many signed data packages", () => {
    const serializedHex = RedstonePayloadSingleSign.prepare(
      signedDataPackages,
      UNSIGNED_METADATA
    );

    expect(serializedHex).toBe(
      EXPECTED_SERIALIZED_DATA_PACKAGE +
      EXPECTED_SIGNATURES[0] +
      EXPECTED_SERIALIZED_DATA_PACKAGE +
      EXPECTED_SIGNATURES[1] +
      "0002" + // data packages count
      "0001" + // payload version
        hexlifyWithout0xPrefix(toUtf8Bytes(UNSIGNED_METADATA)) +
        EXPECTED_UNSIGNED_METADATA_BYTE_SIZE +
        REDSTONE_MARKER
    );
  });

  test("Should correctly serialize multi signed data package", () => {
    const serializedHex = RedstonePayloadMultiSign.prepare(
      multiSignedDataPackage,
      UNSIGNED_METADATA
    );

    expect(serializedHex).toBe(
      EXPECTED_SERIALIZED_DATA_PACKAGE +
      EXPECTED_SIGNATURES[0] +
      EXPECTED_SIGNATURES[1] +
      "0002" + // signatures count
      "0002" + // payload version
        hexlifyWithout0xPrefix(toUtf8Bytes(UNSIGNED_METADATA)) +
        EXPECTED_UNSIGNED_METADATA_BYTE_SIZE +
        REDSTONE_MARKER
    );
  });

  test("Should correctly parse redstone payload", () => {
    const remainderPrefixHex = "0x1234";
    const redstonePayloadHex = RedstonePayloadSingleSign.prepare(
      signedDataPackages,
      UNSIGNED_METADATA
    );

    const parsingResult = RedstonePayloadSingleSign.parse(
      arrayify(remainderPrefixHex + redstonePayloadHex)
    );

    expect(toUtf8String(parsingResult.unsignedMetadata)).toBe(
      UNSIGNED_METADATA
    );
    expect(hexlify(parsingResult.remainderPrefix)).toBe(remainderPrefixHex);

    const newRedstonePayloadHex = RedstonePayloadSingleSign.prepare(
      parsingResult.signedDataPackages,
      UNSIGNED_METADATA
    );
    expect(newRedstonePayloadHex).toBe(redstonePayloadHex);
  });

  test("Should correctly parse redstone payload with multi signed data package", () => {
    const remainderPrefixHex = "0x1234";
    const redstonePayloadHex = RedstonePayloadMultiSign.prepare(
      multiSignedDataPackage,
      UNSIGNED_METADATA
    );

    const parsingResult = RedstonePayloadMultiSign.parse(
      arrayify(remainderPrefixHex + redstonePayloadHex)
    );

    expect(toUtf8String(parsingResult.unsignedMetadata)).toBe(
      UNSIGNED_METADATA
    );
    expect(hexlify(parsingResult.remainderPrefix)).toBe(remainderPrefixHex);

    const newRedstonePayloadHex = RedstonePayloadMultiSign.prepare(
      parsingResult.signedDataPackage,
      UNSIGNED_METADATA
    );
    expect(newRedstonePayloadHex).toBe(redstonePayloadHex);
  });
});
