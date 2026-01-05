import { isNull, isNumber, isObject, isSymbol } from "@venok/core";

import { PATTERN_EXTRAS_METADATA, PATTERN_HANDLER_METADATA, PATTERN_METADATA, TRANSPORT_METADATA } from "~/constants.js";
import { PatternHandler } from "~/enums/pattern-handler.enum.js";

/**
 * Subscribes to incoming events which fulfils chosen pattern.
 *
 * @publicApi
 */
export const EventPattern: {
  <T = string>(metadata?: T): MethodDecorator;
  <T = string>(metadata?: T, transport?: symbol): MethodDecorator;
  <T = string>(metadata?: T, extras?: Record<string, any>): MethodDecorator;
  <T = string>(metadata?: T, transport?: symbol, extras?: Record<string, any>,): MethodDecorator;
} = <T = string>(metadata?: T, transportOrExtras?: symbol | Record<string, any>, maybeExtras?: Record<string, any>): MethodDecorator => {
  let transport: symbol;
  let extras: Record<string, any>;
  if ((isNumber(transportOrExtras) || isSymbol(transportOrExtras)) && isNull(maybeExtras)) {
    transport = transportOrExtras as symbol;
  } else if (isObject(transportOrExtras) && isNull(maybeExtras)) {
    extras = transportOrExtras;
  } else {
    transport = transportOrExtras as symbol;
    extras = maybeExtras!;
  }

  return (target: object, key: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(PATTERN_METADATA, ([] as any[]).concat(metadata), descriptor.value as object);
    Reflect.defineMetadata(PATTERN_HANDLER_METADATA, PatternHandler.EVENT, descriptor.value as object);
    Reflect.defineMetadata(TRANSPORT_METADATA, transport, descriptor.value as object);
    Reflect.defineMetadata(
      PATTERN_EXTRAS_METADATA,
      {
        ...Reflect.getMetadata(PATTERN_EXTRAS_METADATA, descriptor.value as object),
        ...extras,
      },
      descriptor.value as object
    );
    return descriptor;
  };
};