import { ContextType, ParamProperties, PARAMTYPES_METADATA, Type } from "@venok/core";
import { ExecutionContextHost } from "@venok/core/context";
import { isFunction } from "@venok/core/helpers/shared.helper";

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

  public getArgumentsLength<T extends { [key: string]: { index: number } }>(keys: string[], metadata: T): number {
    return keys.length ? Math.max(...keys.map((key) => metadata[key as keyof T].index)) + 1 : 0;
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
    if (!paramtypes) return paramsProperties;

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
    return (args: unknown[]) => {
      const ctx = new ExecutionContextHost(args, instance && (instance.constructor as Type), callback);
      ctx.setType(contextType);
      return ctx;
    };
  }
}
