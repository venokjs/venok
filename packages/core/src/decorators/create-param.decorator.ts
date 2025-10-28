import { uid } from "uid";

import type { CustomParamFactory, ParamDecoratorEnhancer, PipeTransform, Type } from "~/interfaces/index.js";

import { assignCustomParameterMetadata } from "~/helpers/metadata.helper.js";
import { isFunction, isNull } from "~/helpers/shared.helper.js";

import { ROUTE_ARGS_METADATA } from "~/constants.js";

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
