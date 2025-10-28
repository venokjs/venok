import type { PipeTransform } from "~/interfaces/index.js";

import { extendArrayMetadata } from "~/helpers/metadata.helper.js";
import { isFunction } from "~/helpers/shared.helper.js";
import { validateEach } from "~/helpers/validate-each.helper.js";

import { PIPES_METADATA } from "~/constants.js";

/**
 * Decorator that binds pipes to the scope of the provider or method,
 * depending on its context.
 *
 * When `@UsePipes` is used at the controller level, the pipe will be
 * applied to every handler (method) in the provider.
 *
 * When `@UsePipes` is used at the individual handler level, the pipe
 * will apply only to that specific method.
 *
 * @param pipes a single pipe instance or class, or a list of pipe instances or
 * classes.
 *
 * @usageNotes
 * Pipes can also be set up globally for all controllers and routes
 * using `app.useGlobalPipes()`.
 *
 * @publicApi
 */

export function UsePipes(...pipes: (PipeTransform | Function)[]): ClassDecorator & MethodDecorator {
  return (target: any, key?: string | symbol, descriptor?: TypedPropertyDescriptor<any>) => {
    const isPipeValid = <T extends Function | Record<string, any>>(pipe: T) =>
      pipe && (isFunction(pipe) || isFunction((pipe as Record<string, any>).transform));

    if (descriptor) {
      extendArrayMetadata(PIPES_METADATA, pipes, descriptor.value);
      return descriptor;
    }
    validateEach(target, pipes, isPipeValid, "@UsePipes", "pipe");
    extendArrayMetadata(PIPES_METADATA, pipes, target);
    return target;
  };
}
