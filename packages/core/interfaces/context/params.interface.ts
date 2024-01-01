import { ParamData, PipeTransform } from "@venok/core";
import { ContextId } from "@venok/core/injector";

export interface ParamProperties<T = any, IExtractor extends Function = any> {
  index: number;
  type: T | string;
  data: ParamData;
  pipes: PipeTransform[];
  extractValue: IExtractor;
}

export interface ParamsFactory {
  exchangeKeyForValue(type: number, data: ParamData, args: any): any;
}

export type ParamsMetadata = Record<number, ParamMetadata>;

export interface ParamMetadata {
  index: number;
  data?: ParamData;
}

type ParamPropertiesWithMetatype<T = any> = ParamProperties & { metatype?: T };

export type GetParamsMetadata = (
  moduleKey: string,
  contextId?: ContextId,
  inquirerId?: string,
) => ParamPropertiesWithMetatype[];