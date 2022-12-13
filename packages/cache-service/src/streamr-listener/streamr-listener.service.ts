import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { getOracleRegistryState } from "redstone-sdk";
import config from "../config";
import {
  decompressMsg,
  doesStreamExist,
  getStreamIdForNodeByEvmAddress,
  StreamrClient,
  Subscription,
} from "redstone-streamr-proxy";
import { DataPackage } from "../data-packages/data-packages.model";
import { DataPackagesService } from "../data-packages/data-packages.service";
import { BundlrService } from "../bundlr/bundlr.service";

interface StreamrSubscriptions {
  [nodeEvmAddress: string]: Subscription;
}

interface NodeLike {
  evmAddress: string;
  dataServiceId: string;
}

const CRON_EXPRESSION_EVERY_1_MINUTE = "*/1 * * * *";

@Injectable()
export class StreamrListenerService {
  private readonly logger = new Logger(StreamrListenerService.name);
  private readonly streamrClient: StreamrClient = new StreamrClient();
  private subscriptionsState: StreamrSubscriptions = {};

  constructor(
    private dataPackageService: DataPackagesService,
    private bundlrService: BundlrService
  ) {}

  @Cron(CRON_EXPRESSION_EVERY_1_MINUTE)
  handleCron() {
    this.syncStreamrListening();
  }

  async syncStreamrListening() {
    this.logger.log(`Syncing streamr listening`);
    const oracleRegistryState = await getOracleRegistryState();
    const nodeEvmAddresses =
      this.prepareActiveNodeEvmAddresses(oracleRegistryState);

    // Start listening to new nodes' streams
    for (const nodeEvmAddress of nodeEvmAddresses) {
      if (this.subscriptionsState[nodeEvmAddress] === undefined) {
        this.listenToNodeStream(nodeEvmAddress);
      }
    }

    // Stop listening to removed nodes' streams
    for (const subscribedNodeEvmAddress of Object.keys(
      this.subscriptionsState
    )) {
      const nodeIsRegistered = nodeEvmAddresses.some(
        (address) =>
          address.toLowerCase() === subscribedNodeEvmAddress.toLowerCase()
      );
      if (!nodeIsRegistered) {
        this.cancelListeningToNodeStream(subscribedNodeEvmAddress);
      }
    }
  }

  async listenToNodeStream(nodeEvmAddress: string) {
    const streamId = getStreamIdForNodeByEvmAddress(nodeEvmAddress);
    const streamExists = await doesStreamExist(this.streamrClient, streamId);

    if (!streamExists) {
      this.logger.log(`Stream does not exist. Skipping: ${streamId}`);
      return;
    }

    this.logger.log(`Stream exists. Connecting to: ${streamId}`);
    const subscription = await this.streamrClient.subscribe(
      streamId,
      async (message: Uint8Array) => {
        try {
          this.logger.log(`Received a message from stream: ${streamId}`);
          const dataPackagesReceived = decompressMsg(message);
          const dataPackagesToSave =
            await this.dataPackageService.prepareReceivedDataPackagesForBulkSaving(
              dataPackagesReceived,
              nodeEvmAddress
            );
          this.logger.log(`Data packages parsed for node: ${nodeEvmAddress}`);

          await DataPackage.insertMany(dataPackagesToSave);
          this.logger.log(
            `Saved ${dataPackagesToSave.length} data packages for node: ${nodeEvmAddress}`
          );

          if (config.enableArchivingOnArweave) {
            await this.bundlrService.safelySaveDataPackages(dataPackagesToSave);
          }
        } catch (e) {
          this.logger.error("Error occured ", e.stack);
        }
      }
    );
    this.subscriptionsState[nodeEvmAddress] = subscription;
  }

  cancelListeningToNodeStream(nodeEvmAddress: string) {
    const subscription = this.subscriptionsState[nodeEvmAddress];
    if (!!subscription) {
      delete this.subscriptionsState[nodeEvmAddress];
      this.streamrClient.unsubscribe(subscription);
    }
  }

  getAllowedDataServiceIds(): string[] {
    if (config.allowedStreamrDataServiceIds === undefined) {
      return [];
    }

    return config.allowedStreamrDataServiceIds.map((dataServiceId) =>
      dataServiceId.toLowerCase()
    );
  }

  private prepareActiveNodeEvmAddresses(oracleRegistryState: any): string[] {
    const nodes: NodeLike[] = Object.values(oracleRegistryState.nodes);
    this.logger.log(`Found ${nodes.length} node evm addresses`);

    const allowedDataServiceIds = this.getAllowedDataServiceIds();
    if (allowedDataServiceIds.length == 0) {
      this.logger.log(
        `Filter is empty - allowing all of the node evm addresses`
      );
      return nodes.map(({ evmAddress }) => evmAddress);
    }

    const result: string[] = [];

    for (const node of nodes) {
      if (allowedDataServiceIds.includes(node.dataServiceId.toLowerCase())) {
        result.push(node.evmAddress);
      }
    }

    this.logger.log(
      `${result.length} of the node evm addresses remained after filtering them out`
    );

    return result;
  }
}
