import { ParamData } from "@venok/core/decorators/create-param.decorator";
import { PipeTransform } from "@venok/core/interfaces/features/pipes.interface";
import { PARAMTYPES_METADATA } from "@venok/core/constants";
import { ExecutionContextHost } from "@venok/core/context/execution-host";
import { isFunction } from "@venok/core/utils/shared.utils";
import { ContextType } from "@venok/core/interfaces/context/arguments-host.interface";
import { Type } from "@venok/core/interfaces";

export interface ParamProperties<T = any, IExtractor extends Function = any> {
  index: number;
  type: T | string;
  data: ParamData;
  pipes: PipeTransform[];
  extractValue: IExtractor;
}

export class ContextUtils {
  public mapParamType(key: string): string {
    const keyPair = key.split(":");
    return keyPair[0];
  }

  public reflectCallbackParamtypes(instance: object, methodName: string): any[] {
    return Reflect.getMetadata(PARAMTYPES_METADATA, instance, methodName);
  }

  public reflectCallbackMetadata<T = any>(instance: object, methodName: string, metadataKey: string): T {
    return Reflect.getMetadata(metadataKey, instance.constructor, methodName);
  }

  public getArgumentsLength<T>(keys: string[], metadata: T): number {
    // Maybe Error
    // @ts-ignore
    return keys.length ? Math.max(...keys.map((key) => metadata[key].index)) + 1 : 0;
  }

  public createNullArray(length: number): any[] {
    const a = new Array(length);
    for (let i = 0; i < length; ++i) a[i] = undefined;
    return a;
  }

  public mergeParamsMetatypes(
    paramsProperties: ParamProperties[],
    paramtypes: any[],
  ): (ParamProperties & { metatype?: any })[] {
    if (!paramtypes) {
      return paramsProperties;
    }
    return paramsProperties.map((param) => ({
      ...param,
      metatype: paramtypes[param.index],
    }));
  }

  public getCustomFactory(
    factory: (...args: unknown[]) => void,
    data: unknown,
    contextFactory: (args: unknown[]) => ExecutionContextHost,
  ): (...args: unknown[]) => unknown {
    return isFunction(factory) ? (...args: unknown[]) => factory(data, contextFactory(args)) : () => null;
  }

  public getContextFactory<TContext extends string = ContextType>(
    contextType: TContext,
    instance?: object,
    callback?: Function,
  ): (args: unknown[]) => ExecutionContextHost {
    const contextFactory = (args: unknown[]) => {
      const ctx = new ExecutionContextHost(args, instance && (instance.constructor as Type<unknown>), callback);
      ctx.setType(contextType);
      return ctx;
    };
    return contextFactory;
  }
}
