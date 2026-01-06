import type { MetadataScanner } from "@venok/core";

import type { MicroservicePatternHandlerMetadata } from "~/interfaces/index.js";

import { isUndefined } from "@venok/core";

import { PATTERN_EXTRAS_METADATA, PATTERN_HANDLER_METADATA, PATTERN_METADATA, TRANSPORT_METADATA } from "~/constants.js";
import { PatternHandler } from "~/enums/pattern-handler.enum.js";


export class PatternFinder {
  constructor(private readonly metadataScanner: MetadataScanner) {}

  public explore(instance: object): MicroservicePatternHandlerMetadata[] {
    const instancePrototype: object = Object.getPrototypeOf(instance);
    return this.metadataScanner
      .getAllMethodNames(instancePrototype)
      .map(method => this.exploreMethodMetadata(instance, instancePrototype, method)!)
      .filter(Boolean);
  }

  public exploreMethodMetadata<T extends Record<string | symbol, any>>(
    instance: T,
    instancePrototype: T,
    methodKey: string
  ): MicroservicePatternHandlerMetadata | undefined {
    const prototypeCallback: object = instancePrototype[methodKey];
    const handlerType = Reflect.getMetadata(PATTERN_HANDLER_METADATA, prototypeCallback);
    if (isUndefined(handlerType)) return;

    const patterns = Reflect.getMetadata(PATTERN_METADATA, prototypeCallback);
    const transport = Reflect.getMetadata(TRANSPORT_METADATA, prototypeCallback);
    const extras = Reflect.getMetadata(PATTERN_EXTRAS_METADATA, prototypeCallback);

    return {
      methodKey,
      patterns,
      transport,
      extras,
      isEventHandler: handlerType === PatternHandler.EVENT,
    };
  }
}