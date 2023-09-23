import { uid } from "uid";
import { Type } from "@venok/core/interfaces";
import { PipeTransform } from "@venok/core/interfaces/features/pipes.interface";
import { CUSTOM_ROUTE_ARGS_METADATA, ROUTE_ARGS_METADATA } from "@venok/core/constants";
import { isFunction, isNull } from "@venok/core/utils/shared.utils";

export type ParamDecoratorEnhancer = ParameterDecorator;

/**
 * @publicApi
 */
export type CustomParamFactory<TData = any, TInput = any, TOutput = any> = (data: TData, input: TInput) => TOutput;

export type ParamData = object | string | number;
export interface RouteParamMetadata {
  index: number;
  data?: ParamData;
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

/**
 * Defines HTTP route param decorator
 *
 * @param factory
 *
 * @param enhancers
 * @publicApi
 */
export function createParamDecorator<FactoryData = any, FactoryInput = any, FactoryOutput = any>(
  factory: CustomParamFactory<FactoryData, FactoryInput, FactoryOutput>,
  enhancers: ParamDecoratorEnhancer[] = [],
): (...dataOrPipes: (Type<PipeTransform> | PipeTransform | FactoryData)[]) => ParameterDecorator {
  const paramtype = uid(21);
  return (data?, ...pipes: (Type<PipeTransform> | PipeTransform | FactoryData)[]): ParameterDecorator =>
    (target, key, index) => {
      const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, target.constructor, key as any) || {};

      const isPipe = (pipe: any) =>
        pipe &&
        ((isFunction(pipe) && pipe.prototype && isFunction(pipe.prototype.transform)) || isFunction(pipe.transform));

      const hasParamData = isNull(data) || !isPipe(data);
      const paramData = hasParamData ? (data as any) : undefined;
      const paramPipes = hasParamData ? pipes : [data, ...pipes];

      Reflect.defineMetadata(
        ROUTE_ARGS_METADATA,
        assignCustomParameterMetadata(args, paramtype, index, factory, paramData, ...(paramPipes as PipeTransform[])),
        target.constructor,
        key as any,
      );
      enhancers.forEach((fn) => fn(target, key, index));
    };
}
