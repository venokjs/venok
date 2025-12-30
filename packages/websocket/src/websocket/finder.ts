import type { MetadataScanner, ParamsMetadata } from "@venok/core";

import { isUndefined } from "@venok/core";
import { MESSAGE_METADATA, PARAM_ARGS_METADATA } from "~/constants.js";
import { WsParamtype } from "~/enums/ws-paramtype.js";

export type GatewayHandlerMetadata = {
  pattern: string;
  methodName: string;
  isAckHandledManually: boolean;
};

export class GatewayFinder {
  public constructor(private readonly metadataScanner: MetadataScanner) {}

  public getGatewayHandlers(instance: object, prototype?: object) {
    const instancePrototype: object = isUndefined(prototype) ? Object.getPrototypeOf(instance) : prototype;

    return this.metadataScanner.getAllMethodNames(instancePrototype).reduce((acc: GatewayHandlerMetadata[], method) => {
      const route = this.exploreMethod(instance, instancePrototype, method);
      if (route) acc.push(route);
      return acc;
    }, []);
  }

  private exploreMethod<T extends Record<string | symbol, any>>(
    instance: T,
    prototype: T,
    methodName: string
  ): GatewayHandlerMetadata | null {
    const prototypeCallback: object = prototype[methodName];

    const message = Reflect.getMetadata(MESSAGE_METADATA, prototypeCallback);
    if (isUndefined(message)) return null;

    const isAckHandledManually = this.hasAckDecorator(prototype, methodName);


    return { pattern: message, methodName, isAckHandledManually };
  }

  private hasAckDecorator(instancePrototype: object, methodName: string): boolean {
    const paramsMetadata: ParamsMetadata = Reflect.getMetadata(PARAM_ARGS_METADATA, instancePrototype.constructor, methodName);
    if (!paramsMetadata) return false;

    const metadataKeys = Object.keys(paramsMetadata);
    return metadataKeys.some(key => {
      const type = +key.split(":")[0] as WsParamtype;
      return type === WsParamtype.ACK;
    });
  }
}