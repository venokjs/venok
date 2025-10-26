import { uid } from "uid";
import type { ScopeOptions, Type } from "@venok/core/interfaces/index.js";
import { INJECTABLE_WATERMARK, SCOPE_OPTIONS_METADATA } from "@venok/core/constants.js";

/**
 * Defines the injection scope.
 *
 * @publicApi
 */
export type InjectableOptions = ScopeOptions;

/**
 * Decorator that marks a class as a provider(https://venok.com/providers).
 * Providers can be injected into other classes via constructor parameter injection
 * using Venok built-in [Dependency Injection (DI)](https://venok.com/providers#dependency-injection)
 * system.
 *
 * When injecting a provider, it must be visible within the module scope (loosely
 * speaking, the containing module) of the class it is being injected into. This
 * can be done by:
 *
 * - defining the provider in the same module scope
 * - exporting the provider from one module scope and importing that module into the
 *   module scope of the class being injected into
 * - exporting the provider from a module that is marked as global using the
 *   `@Global()` decorator
 *
 * Providers can also be defined in a more explicit and imperative form using
 * various [custom provider](https://venok.com/fundamentals/custom-providers) techniques that expose
 * more capabilities of the DI system.
 *
 * @param options options specifying scope of injectable
 *
 * @see [Providers](https://venok.com/providers)
 * @see [Custom Providers](https://venok.com/fundamentals/custom-providers)
 * @see [Injection Scopes](https://venok.com/fundamentals/injection-scopes)
 *
 * @publicApi
 */
export function Injectable(options?: InjectableOptions): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(INJECTABLE_WATERMARK, true, target);
    Reflect.defineMetadata(SCOPE_OPTIONS_METADATA, options, target);
  };
}

/**
 * @publicApi
 */
export function mixin<T>(mixinClass: Type<T>) {
  Object.defineProperty(mixinClass, "name", {
    value: uid(21),
  });
  Injectable()(mixinClass);
  return mixinClass;
}
