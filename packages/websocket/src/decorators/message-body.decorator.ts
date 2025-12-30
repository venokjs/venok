import type { PipeTransform, Type } from "@venok/core";

import { createNativeParamDecorator, isFunction, isNumber, isString } from "@venok/core";

import { WsParamtype } from "~/enums/ws-paramtype.js";

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

/**
 * WebSockets message body parameter decorator.
 *
 * @publicApi
 */
export function MessageBody(): ParameterDecorator;
/**
 * WebSockets message body parameter decorator.
 *
 * Example:
 * ```ts
 * create(@MessageBody(new ValidationPipe()) createDto: CreateCatDto)
 * ```
 * @param pipes one or more pipes - either instances or classes - to apply to
 * the bound parameter.
 *
 * @publicApi
 */
export function MessageBody(...pipes: (Type<PipeTransform> | PipeTransform)[]): ParameterDecorator;
/**
 * WebSockets message body parameter decorator. Extracts a property from the
 * message payload object. May also apply pipes to the bound parameter.
 *
 * For example, extracting all params:
 * ```ts
 * findMany(@MessageBody() ids: string[])
 * ```
 *
 * For example, extracting a single param:
 * ```ts
 * create(@MessageBody('data') createDto: { data: string })
 * ```
 *
 * For example, extracting a single param with pipe:
 * ```ts
 * create(@MessageBody('data', new ValidationPipe()) createDto: { data: string })
 * ```
 * @param propertyKey name of single property to extract from the message payload
 * @param pipes one or more pipes - either instances or classes - to apply to
 * the bound parameter.
 *
 * @publicApi
 */
export function MessageBody(propertyKey: string | number, ...pipes: (Type<PipeTransform> | PipeTransform)[]): ParameterDecorator;
export function MessageBody(
  propertyOrPipe?: string | number | (Type<PipeTransform> | PipeTransform),
  ...pipes: (Type<PipeTransform> | PipeTransform)[]
): ParameterDecorator {
  if (!isPipe(propertyOrPipe)) {
    if (!isString(propertyOrPipe) && !isNumber(propertyOrPipe))
      return createNativeParamDecorator(WsParamtype.PAYLOAD)(undefined, ...pipes);
  }
  return createNativeParamDecorator(WsParamtype.PAYLOAD)(propertyOrPipe, ...pipes);
}