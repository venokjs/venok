import type {
  ContextId,
  ExternalContextOptions,
  VenokParamsFactoryInterface
} from "@venok/core";

import { STATIC_CONTEXT, VenokContextCreator } from "@venok/core";
import { MESSAGE_METADATA } from "~/constants.js";


export class WebsocketContextCreator extends VenokContextCreator {

  public override create(
    instance: object,
    callback: (...args: unknown[]) => unknown,
    methodName: string,
    metadataKey?: string,
    paramsFactory?: VenokParamsFactoryInterface,
    contextId: ContextId = STATIC_CONTEXT,
    inquirerId?: string,
    options: ExternalContextOptions = {
      interceptors: true,
      guards: true,
      filters: false,
      callback: undefined,
    },
    contextType = "websocket"
  ): (...args: any[]) => Promise<any> {
    const moduleKey = this.getContextModuleKey(instance.constructor);

    const targetPattern = this.reflectCallbackPattern(callback);

    const result = super.create(
      instance,
      callback,
      methodName,
      metadataKey,
      paramsFactory,
      contextId,
      inquirerId,
      options,
      contextType as any
    );

    const exceptionFilter = this.filtersContextCreator.create(instance, callback, moduleKey, contextId, inquirerId);
    return async (...args: any[]) => {
      args.push(targetPattern);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return await this.venokProxy.createProxy(result, exceptionFilter, contextType)(...args);
    };
  }

  public reflectCallbackPattern(callback: (...args: any[]) => any): string {
    return Reflect.getMetadata(MESSAGE_METADATA, callback);
  }
}