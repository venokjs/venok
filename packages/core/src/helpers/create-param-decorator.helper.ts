import type {
  CustomParamFactory,
  ParamData,
  ParamDecoratorEnhancer,
  ParamMetadata,
  PipeTransform,
  Type
} from "~/interfaces/index.js";

import { uid } from "uid";

import { assignCustomParameterMetadata, assignMetadata } from "~/helpers/metadata.helper.js";
import { isFunction, isNull } from "~/helpers/shared.helper.js";
import { ROUTE_ARGS_METADATA } from "~/constants.js";

type DefaultParamTypes = { [key: string]: string | number };
type HandlerArgsMetadata = Record<string, ParamMetadata>;

const getHandlerArgsMetadata = (target: object, key: string): HandlerArgsMetadata => {
  return Reflect.getMetadata(ROUTE_ARGS_METADATA, target.constructor, key) || {};
};

const setHandlerArgsMetadata = (target: object, key: string, args: HandlerArgsMetadata): void => {
  Reflect.defineMetadata(ROUTE_ARGS_METADATA, args, target.constructor, key);
};

const isPipe = (pipe: any) => {
  return pipe &&
    (
      (
        isFunction(pipe) &&
        pipe.prototype &&
        isFunction(pipe.prototype.transform)
      ) || isFunction(pipe.transform)
    );
};

export const createParamDecoratorWithoutPipes = 
  <
    FactoryData = any,
    FactoryContext = any, 
    FactoryOutput = any
  >(factory: CustomParamFactory<FactoryData, FactoryContext, FactoryOutput>): (data?: ParamData) => ParameterDecorator => {
    const paramtype = uid(21);
    return (data?): ParameterDecorator =>
      (target, key, index) => {
        const args = getHandlerArgsMetadata(target, key as string);

        setHandlerArgsMetadata(
          target,
          key as string,
          assignCustomParameterMetadata(args, paramtype, index, factory, data)
        );
      };
  };

/**
 * Defines custom param decorator
 *
 * @param factory
 * @param enhancers
 *
 * @publicApi
 */
export const createParamDecorator =
  <
    FactoryData = any, 
    FactoryContext = any, 
    FactoryOutput = any
  >(
    factory: CustomParamFactory<FactoryData, FactoryContext, FactoryOutput>,
    enhancers: ParamDecoratorEnhancer[] = []
  ): (...dataOrPipes: (Type<PipeTransform> | PipeTransform | FactoryData)[]) => ParameterDecorator => {
    const paramtype = uid(21);
    return (data?, ...pipes: (Type<PipeTransform> | PipeTransform | FactoryData)[]): ParameterDecorator =>
      (target, key, index) => {
        const args = getHandlerArgsMetadata(target, key as string);

        const hasParamData = isNull(data) || !isPipe(data);
        const paramData = hasParamData ? (data as ParamData) : undefined;
        const paramPipes: (Type<PipeTransform> | PipeTransform | FactoryData)[] = hasParamData ? pipes : [data, ...pipes];

        setHandlerArgsMetadata(
          target,
          key as string,
          assignCustomParameterMetadata(args, paramtype, index, factory, paramData, ...(paramPipes as PipeTransform[]))
        );

        enhancers.forEach((fn) => fn(target, key, index));
      };
  };

export const createNativeParamDecoratorWithoutPipes = <Paramtypes extends DefaultParamTypes>(paramtype: Paramtypes[string])=> {
  return (data?: ParamData): ParameterDecorator =>
    (target, key, index) => {
      const args = getHandlerArgsMetadata(target, key as string);

      setHandlerArgsMetadata(
        target,
        key as string,
        assignMetadata<Paramtypes[string]>(args, paramtype, index, data)
      );
    };
};

export const createNativeParamDecorator = <Paramtypes extends DefaultParamTypes>(paramtype: Paramtypes[string]) => {
  return (data?: any, ...pipes: (Type<PipeTransform> | PipeTransform)[]): ParameterDecorator => {
    return (target, key, index) => {
      const args = getHandlerArgsMetadata(target, key as string);

      const hasParamData = isNull(data) || !isPipe(data);
      const paramData = hasParamData ? data : undefined;
      const paramPipes: Type<PipeTransform> | PipeTransform[] = hasParamData ? pipes : [data, ...pipes];

      setHandlerArgsMetadata(
        target,
        key as string,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        assignMetadata<Paramtypes[string]>(args, paramtype, index, paramData, ...paramPipes)
      );
    };
  };
};