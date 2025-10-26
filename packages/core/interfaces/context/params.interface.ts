import type { PipeTransform } from "@venok/core";
import type { ContextId } from "@venok/core/injector/index.js";

export type ParamData = object | string | number;

export interface ParamProperties<T = any, IExtractor extends Function = any> {
  index: number;
  type: T | string;
  data: ParamData;
  pipes: PipeTransform[];
  extractValue: IExtractor;
}

export interface VenokParamsFactoryInterface<TKey = unknown> {
  exchangeKeyForValue(key: TKey | string, data: any, args: any[]): any;
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
