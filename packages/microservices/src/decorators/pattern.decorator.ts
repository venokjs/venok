import type { MicroservicePattern } from "~/interfaces/index.js";

import { isNull, isNumber, isObject, isSymbol } from "@venok/core";

import { PATTERN_EXTRAS_METADATA, PATTERN_HANDLER_METADATA, PATTERN_METADATA, TRANSPORT_METADATA } from "~/constants.js";
import { PatternHandler } from "~/enums/pattern-handler.enum.js";

/**
 * Parses transport and extras from decorator arguments
 */
export const parseTransportAndExtras = (
  transportOrExtras?: symbol | Record<string, any>,
  maybeExtras?: Record<string, any>
): { transport: symbol; extras: Record<string, any> } => {
  let transport!: symbol;
  let extras!: Record<string, any>;
  
  if ((isNumber(transportOrExtras) || isSymbol(transportOrExtras)) && isNull(maybeExtras)) {
    transport = transportOrExtras as symbol;
  } else if (isObject(transportOrExtras) && isNull(maybeExtras)) {
    extras = transportOrExtras;
  } else {
    transport = transportOrExtras as symbol;
    extras = maybeExtras!;
  }

  return { transport: transport, extras: extras };
};

/**
 * Sets pattern metadata using Reflect
 */
export const setPatternMetadata = (
  metadata: any,
  patternHandler: PatternHandler,
  transport: symbol,
  extras: Record<string, any>,
  descriptor: PropertyDescriptor
): PropertyDescriptor => {
  Reflect.defineMetadata(PATTERN_METADATA, ([] as any[]).concat(metadata), descriptor.value as object);
  Reflect.defineMetadata(PATTERN_HANDLER_METADATA, patternHandler, descriptor.value as object);
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

/**
 * Subscribes to incoming events which fulfils chosen pattern.
 *
 * @publicApi
 */
export const EventPatternNew: {
  <T = string>(metadata?: T): MethodDecorator;
  <T = string>(metadata?: T, transport?: symbol): MethodDecorator;
  <T = string>(metadata?: T, extras?: Record<string, any>): MethodDecorator;
  <T = string>(metadata?: T, transport?: symbol, extras?: Record<string, any>,): MethodDecorator;
} = <T = string>(metadata?: T, transportOrExtras?: symbol | Record<string, any>, maybeExtras?: Record<string, any>): MethodDecorator => {
  const { transport, extras } = parseTransportAndExtras(transportOrExtras, maybeExtras);

  return (target: object, key: string | symbol, descriptor: PropertyDescriptor) => {
    return setPatternMetadata(metadata, PatternHandler.EVENT, transport, extras, descriptor);
  };
};

/**
 * Subscribes to incoming messages which fulfils chosen pattern.
 *
 * @publicApi
 */
export const MessagePatternNew: {
  <T = MicroservicePattern>(metadata?: T): MethodDecorator;
  <T = MicroservicePattern>(metadata?: T, transport?: symbol): MethodDecorator;
  <T = MicroservicePattern>(metadata?: T, extras?: Record<string, any>): MethodDecorator;
  <T = MicroservicePattern>(metadata?: T, transport?: symbol, extras?: Record<string, any>): MethodDecorator;
} = <T = MicroservicePattern>(
  metadata?: T,
  transportOrExtras?: symbol | Record<string, any>,
  maybeExtras?: Record<string, any>
): MethodDecorator => {
  const { transport, extras } = parseTransportAndExtras(transportOrExtras, maybeExtras);

  return (target: object, key: string | symbol, descriptor: PropertyDescriptor) => {
    return setPatternMetadata(metadata, PatternHandler.MESSAGE, transport, extras, descriptor);
  };
};