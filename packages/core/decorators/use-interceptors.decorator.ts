import { VenokInterceptor } from "@venok/core/interfaces/features/interceptor.interface";
import { isFunction } from "@venok/core/utils/shared.utils";
import { INTERCEPTORS_METADATA } from "@venok/core/constants";
import { validateEach } from "@venok/core/helpers/validate-each.helper";
import { extendArrayMetadata } from "@venok/core/helpers/extends-metadata.helper";

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
      interceptor && (isFunction(interceptor) || isFunction((interceptor as Record<string, any>).intercept));

    if (descriptor) {
      validateEach(target.constructor, interceptors, isInterceptorValid, "@UseInterceptors", "interceptor");
      extendArrayMetadata(INTERCEPTORS_METADATA, interceptors, descriptor.value);
      return descriptor;
    }
    validateEach(target, interceptors, isInterceptorValid, "@UseInterceptors", "interceptor");
    extendArrayMetadata(INTERCEPTORS_METADATA, interceptors, target);
    return target;
  };
}
