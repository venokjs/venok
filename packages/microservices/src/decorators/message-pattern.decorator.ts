import type { MicroservicePattern } from "~/interfaces/index.js";
import { isNull, isNumber, isObject, isSymbol } from "@venok/core";
import {
  PATTERN_EXTRAS_METADATA,
  PATTERN_HANDLER_METADATA,
  PATTERN_METADATA,
  TRANSPORT_METADATA
} from "~/constants.js";
import { PatternHandler } from "~/enums/pattern-handler.enum.js";

/**
 * Subscribes to incoming messages which fulfils chosen pattern.
 *
 * @publicApi
 */
export const MessagePattern: {
  <T = MicroservicePattern>(metadata?: T): MethodDecorator;
  <T = MicroservicePattern>(metadata?: T, transport?: symbol): MethodDecorator;
  <T = MicroservicePattern>(metadata?: T, extras?: Record<string, any>): MethodDecorator;
  <T = MicroservicePattern>(metadata?: T, transport?: symbol, extras?: Record<string, any>): MethodDecorator;
} = <T = MicroservicePattern>(
  metadata?: T,
  transportOrExtras?: symbol | Record<string, any>,
  maybeExtras?: Record<string, any>
): MethodDecorator => {
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
    Reflect.defineMetadata(PATTERN_HANDLER_METADATA, PatternHandler.MESSAGE, descriptor.value as object);
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