import { CanActivate } from "@venok/core/interfaces/features/guards.interface";
import { isFunction } from "@venok/core/helpers/shared.helper";
import { GUARDS_METADATA } from "@venok/core/constants";
import { validateEach } from "@venok/core/helpers/validate-each.helper";
import { extendArrayMetadata } from "@venok/core/helpers/metadata.helper";

/**
 * Decorator that binds guards to the scope of the provider or method,
 * depending on its context.
 *
 * When `@UseGuards` is used at the controller level, the guard will be
 * applied to every handler (method) in the provider.
 *
 * When `@UseGuards` is used at the individual handler level, the guard
 * will apply only to that specific method.
 *
 * @param guards a single guard instance or class, or a list of guard instances
 * or classes.
 *
 * @usageNotes
 * Guards can also be set up globally for all controllers and routes
 * using `app.useGlobalGuards()`.
 *
 * @publicApi
 */
export function UseGuards(...guards: (CanActivate | Function)[]): MethodDecorator & ClassDecorator {
  return (target: any, key?: string | symbol, descriptor?: TypedPropertyDescriptor<any>) => {
    const isGuardValid = <T extends Function | Record<string, any>>(guard: T) =>
      guard && (isFunction(guard) || isFunction((guard as Record<string, any>).canActivate));

    if (descriptor) {
      validateEach(target.constructor, guards, isGuardValid, "@UseGuards", "guard");
      extendArrayMetadata(GUARDS_METADATA, guards, descriptor.value);
      return descriptor;
    }
    validateEach(target, guards, isGuardValid, "@UseGuards", "guard");
    extendArrayMetadata(GUARDS_METADATA, guards, target);
    return target;
  };
}
