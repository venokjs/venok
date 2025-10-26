import {
  CUSTOM_ROUTE_ARGS_METADATA,
  type CustomParamFactory,
  type ParamData,
  type PipeTransform,
  type Type,
} from "@venok/core";

export function extendArrayMetadata<T extends Array<unknown>>(key: string, metadata: T, target: Function) {
  const previousValue = Reflect.getMetadata(key, target) || [];
  const value = [...previousValue, ...metadata];
  Reflect.defineMetadata(key, value, target);
}

export function assignMetadata<TParamtype = any, TArgs = any>(
  args: TArgs,
  paramtype: TParamtype,
  index: number,
  data?: ParamData,
  ...pipes: (Type<PipeTransform> | PipeTransform)[]
) {
  return {
    ...args,
    [`${paramtype}:${index}`]: {
      index,
      data,
      pipes,
    },
  };
}

export function assignCustomParameterMetadata(
  args: Record<number, any>,
  paramtype: number | string,
  index: number,
  factory: CustomParamFactory,
  data?: ParamData,
  ...pipes: (Type<PipeTransform> | PipeTransform)[]
) {
  return {
    ...args,
    [`${paramtype}${CUSTOM_ROUTE_ARGS_METADATA}:${index}`]: {
      index,
      factory,
      data,
      pipes,
    },
  };
}
