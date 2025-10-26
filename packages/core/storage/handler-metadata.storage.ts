import type { GetParamsMetadata, Provider, Type } from "@venok/core";
import { PROVIDER_ID_KEY } from "@venok/core/injector/index.js";

export const HANDLER_METADATA_SYMBOL = Symbol.for("handler_metadata:cache");

export interface HandlerMetadata {
  argsLength: number;
  paramtypes: any[];
  getParamsMetadata: GetParamsMetadata;
}

export class HandlerMetadataStorage<TValue = HandlerMetadata, TKey extends Type<unknown> = any> {
  private readonly [HANDLER_METADATA_SYMBOL] = new Map<string, TValue>();

  set(instance: TKey, methodName: string, metadata: TValue) {
    const metadataKey = this.getMetadataKey(instance, methodName);
    this[HANDLER_METADATA_SYMBOL].set(metadataKey, metadata);
  }

  get(instance: TKey, methodName: string): TValue | undefined {
    const metadataKey = this.getMetadataKey(instance, methodName);
    return this[HANDLER_METADATA_SYMBOL].get(metadataKey);
  }

  private getMetadataKey(instance: Provider, methodName: string): string {
    const ctor = instance.constructor;
    const controllerKey: string = ctor && (ctor[PROVIDER_ID_KEY as keyof Provider] || ctor.name);
    return controllerKey + methodName;
  }
}
