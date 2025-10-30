import type { VenokInterceptor } from "~/interfaces/index.js";

import { extendArrayMetadata } from "~/helpers/metadata.helper.js";
import { isFunction } from "~/helpers/shared.helper.js";
import { validateEach } from "~/helpers/validate-each.helper.js";

import { INTERCEPTORS_METADATA } from "~/constants.js";

/**
 * Decorator that binds interceptors to the scope of the provider or method,
 * depending on its context.
 *
 * When `@UseInterceptors` is used at the controller level, the interceptor will
 * be applied to every handler (method) in the provider.
 *
 * When `@UseInterceptors` is used at the individual handler level, the interceptor
 * will apply only to that specific method.
 *
 * @param interceptors a single interceptor instance or class, or a list of
 * interceptor instances or classes.
 *
 * @usageNotes
 * Interceptors can also be set up globally for all controllers and routes
 * using `app.useGlobalInterceptors()`.
 *
 * @publicApi
 */
export function UseInterceptors(...interceptors: (VenokInterceptor | Function)[]): MethodDecorator & ClassDecorator {
  return (target: any, key?: string | symbol, descriptor?: TypedPropertyDescriptor<any>) => {
    const isInterceptorValid = <T extends Function | Record<string, any>>(interceptor: T) =>
      // @ts-expect-error Mismatch types
      interceptor && (isFunction(interceptor) || isFunction((interceptor).intercept));

    if (descriptor) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      validateEach(target.constructor, interceptors, isInterceptorValid, "@UseInterceptors", "interceptor");
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      extendArrayMetadata(INTERCEPTORS_METADATA, interceptors, descriptor.value);
      return descriptor;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    validateEach(target, interceptors, isInterceptorValid, "@UseInterceptors", "interceptor");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    extendArrayMetadata(INTERCEPTORS_METADATA, interceptors, target);
    return target;
  };
}
