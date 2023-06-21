import { base64, concat } from "ethers/lib/utils";
import { Serializable } from "../common/Serializable";
import { convertStringToBytes32, ConvertibleToBytes32 } from "../common/utils";
import { INumericDataPoint } from "./NumericDataPoint";
import { IStringDataPoint } from "./StringDataPoint";

export interface IStandardDataPoint {
  dataFeedId: ConvertibleToBytes32;
  value: string; // base64-encoded bytes
  metadata?: Metadata;
}
export type DataPointPlainObj = IStandardDataPoint | INumericDataPoint;

export enum MetadataDataPointType {
  PRICE_V1,
}

export interface PriceMetadata {
  type: MetadataDataPointType.PRICE_V1;
  /** <source, priceAsFloatString> */
  sources?: Record<string, string>;
}

/**
 * This is union of all possible metadata
 * .type field is used to detect type.
 */
export type Metadata = PriceMetadata;

export class DataPoint extends Serializable {
  constructor(
    public readonly dataFeedId: ConvertibleToBytes32,
    public readonly value: Uint8Array,
    public readonly metadata?: PriceMetadata
  ) {
    super();
  }

  serializeDataFeedId(): Uint8Array {
    return convertStringToBytes32(this.dataFeedId);
  }

  toObj(): DataPointPlainObj {
    return {
      dataFeedId: this.dataFeedId,
      value: base64.encode(this.value),
      metadata: this.metadata,
    };
  }

  getValueByteSize(): number {
    return this.value.length;
  }

  toBytes(): Uint8Array {
    const serializedDataFeedId = this.serializeDataFeedId();
    return concat([serializedDataFeedId, this.value]);
  }
}
