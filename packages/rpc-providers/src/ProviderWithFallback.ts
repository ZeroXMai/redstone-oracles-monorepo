import { ErrorCode } from "@ethersproject/logger";
import {
  EventType,
  JsonRpcProvider,
  Listener,
  Network,
  Provider,
  TransactionReceipt,
} from "@ethersproject/providers";
import { ProviderWithFallbackBase } from "./ProviderWithFallbackBase";

export type ProviderWithFallbackConfig = {
  unrecoverableErrors: ErrorCode[];
  logger: { info: (message: string) => void; warn: (message: string) => void };
  providerNames?: string[];
};

export const FALLBACK_DEFAULT_CONFIG: ProviderWithFallbackConfig = {
  unrecoverableErrors: [
    ErrorCode.CALL_EXCEPTION,
    ErrorCode.MISSING_ARGUMENT,
    ErrorCode.MISSING_NEW,
  ],
  logger: { info: console.log, warn: console.log },
};

export class ProviderWithFallback
  extends ProviderWithFallbackBase
  implements Provider
{
  private readonly config: ProviderWithFallbackConfig;
  private currentProvider: Provider;
  private readonly providers: Provider[];
  private providerIndex = 0;

  private globalListeners: {
    eventType: EventType;
    listener: Listener;
    once: boolean;
  }[] = [];

  constructor(
    providers: JsonRpcProvider[],
    config: Partial<ProviderWithFallbackConfig> = {}
  ) {
    super();
    const mainProvider = providers[0];
    if (providers.length < 2) {
      throw new Error("Please provide at least two providers");
    }

    this.currentProvider = mainProvider;
    this.providers = [...providers];
    this.config = { ...FALLBACK_DEFAULT_CONFIG, ...config };
  }

  override getNetwork(): Promise<Network> {
    return this.currentProvider.getNetwork();
  }

  override on(eventName: EventType, listener: Listener): Provider {
    this.saveGlobalListener(eventName, listener);
    return this.currentProvider.on(eventName, listener);
  }

  override once(eventName: EventType, listener: Listener): Provider {
    this.saveGlobalListener(eventName, listener);
    return this.currentProvider.once(eventName, listener);
  }

  override emit(eventName: EventType, ...args: any[]): boolean {
    return this.currentProvider.emit(eventName, ...args);
  }

  override listenerCount(eventName?: EventType | undefined): number {
    return this.currentProvider.listenerCount(eventName);
  }

  override listeners(eventName?: EventType | undefined): Listener[] {
    return this.currentProvider.listeners(eventName);
  }

  override addListener(eventName: EventType, listener: Listener): Provider {
    return this.currentProvider.addListener(eventName, listener);
  }

  override off(
    eventName: EventType,
    listener?: Listener | undefined
  ): Provider {
    this.currentProvider.off(eventName, listener);
    this.updateGlobalListenerAfterRemoval();

    return this.currentProvider;
  }

  override removeAllListeners(eventName?: EventType | undefined): Provider {
    this.currentProvider.removeAllListeners(eventName);
    this.updateGlobalListenerAfterRemoval();

    return this.currentProvider;
  }

  override removeListener(eventName: EventType, listener: Listener): Provider {
    this.currentProvider.removeListener(eventName, listener);
    this.updateGlobalListenerAfterRemoval();

    return this.currentProvider;
  }

  override waitForTransaction(
    transactionHash: string,
    confirmations?: number | undefined,
    timeout?: number | undefined
  ): Promise<TransactionReceipt> {
    return this.currentProvider.waitForTransaction(
      transactionHash,
      confirmations,
      timeout
    );
  }

  private saveGlobalListener(
    eventType: EventType,
    listener: Listener,
    once = false
  ) {
    this.globalListeners.push({ eventType, listener, once });
  }

  /**
   * To avoid copying logic of removing events from BaseProvider.
   * Just remove listeners which were removed from _currentProvider
   */
  private updateGlobalListenerAfterRemoval() {
    const allCurrentListeners = this.currentProvider.listeners();
    for (let i = 0; i < this.globalListeners.length; i++) {
      if (!allCurrentListeners.includes(this.globalListeners[i].listener)) {
        this.globalListeners.splice(i, 1);
      }
    }
  }

  protected override async executeWithFallback(
    retryNumber = 0,
    fnName: string,
    ...args: any[]
  ): Promise<any> {
    try {
      return await (this.currentProvider as any)[fnName](...[...args]);
    } catch (error: any) {
      const newProviderIndex = this.electNewProviderOrFail(error, retryNumber);
      this.useProvider(newProviderIndex);

      return await this.executeWithFallback(retryNumber + 1, fnName, ...args);
    }
  }

  private useProvider(providerIndex: number) {
    this.currentProvider.removeAllListeners();
    this.providerIndex = providerIndex;
    const newProvider = this.providers[this.providerIndex];
    this.currentProvider = newProvider;

    for (const { listener, once, eventType } of this.globalListeners) {
      if (once) {
        this.currentProvider.once(eventType, listener);
      } else {
        this.currentProvider.on(eventType, listener);
      }
    }
  }

  private extractProviderName(index: number): string {
    return this.config.providerNames?.[index] ?? index.toString();
  }

  private electNewProviderOrFail(error: any, retryNumber: number): number {
    const providerName = this.extractProviderName(this.providerIndex);

    if (error?.code && this.config.unrecoverableErrors.includes(error.code)) {
      this.config.logger.warn(
        `Unrecoverable error ${error.code}, rethrowing error`
      );
      throw error;
    }

    this.config.logger.warn(
      `Provider ${providerName} failed with error: ${error?.code} ${error?.message}`
    );

    if (retryNumber === this.providers.length - 1) {
      this.config.logger.warn(
        `All providers failed to execute action, rethrowing error`
      );
      throw error;
    }

    // if we haven't tried provider for this request
    const nextProviderIndex = (this.providerIndex + 1) % this.providers.length;

    const nextProviderName = this.extractProviderName(nextProviderIndex);

    this.config.logger.info(
      `Fallback in to next provider ${nextProviderName}.`
    );

    return nextProviderIndex;
  }
}
