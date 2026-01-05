import type { PipeTransform, Type } from "@venok/core";

import { createNativeParamDecorator } from "@venok/core";

import { MicroserviceParamtype } from "~/enums/microservice-paramtype.js";


/**
 * Microservice message pattern payload parameter decorator.
 *
 * @publicApi
 */
export function Payload(): ParameterDecorator;
/**
 * Microservice message pattern payload parameter decorator.
 *
 * Example:
 * ```ts
 * create(@Payload(new ValidationPipe()) createDto: CreateCatDto)
 * ```
 * @param pipes one or more pipes - either instances or classes - to apply to
 * the bound parameter.
 *
 * @publicApi
 */
export function Payload(
  ...pipes: (Type<PipeTransform> | PipeTransform)[]
): ParameterDecorator;
/**
 * Microservice message pattern payload parameter decorator. Extracts a property from the
 * payload object. May also apply pipes to the bound parameter.
 *
 * For example, extracting all params:
 * ```ts
 * findMany(@Payload() ids: string[])
 * ```
 *
 * For example, extracting a single param:
 * ```ts
 * create(@Payload('data') createDto: { data: string })
 * ```
 *
 * For example, extracting a single param with pipe:
 * ```ts
 * create(@Payload('data', new ValidationPipe()) createDto: { data: string })
 * ```
 * @param propertyKey name of single property to extract from the message payload
 * @param pipes one or more pipes - either instances or classes - to apply to
 * the bound parameter.
 *
 * @publicApi
 */
export function Payload(propertyKey?: string, ...pipes: (Type<PipeTransform> | PipeTransform)[]): ParameterDecorator;
export function Payload(
  propertyOrPipe?: string | (Type<PipeTransform> | PipeTransform),
  ...pipes: (Type<PipeTransform> | PipeTransform)[]
): ParameterDecorator {
  return createNativeParamDecorator(MicroserviceParamtype.PAYLOAD)(propertyOrPipe, ...pipes);
}