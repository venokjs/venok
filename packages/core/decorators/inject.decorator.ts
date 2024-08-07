import { isUndefined } from "@venok/core/helpers/shared.helper";
import { PARAMTYPES_METADATA, PROPERTY_DEPS_METADATA, SELF_DECLARED_DEPS_METADATA } from "@venok/core/constants";

/**
 * Decorator that marks a constructor parameter as a target for
 * Dependency Injection (DI).
 *
 * Any injected provider must be visible within the module scope (loosely
 * speaking, the containing module) of the class it is being injected into. This
 * can be done by:
 *
 * - defining the provider in the same module scope
 * - exporting the provider from one module scope and importing that module into the
 *   module scope of the class being injected into
 * - exporting the provider from a module that is marked as global using the
 *   `@Global()` decorator
 *
 * #### Injection tokens
 * Can be *types* (class names), *strings* or *symbols*. This depends on how the
 * provider with which it is associated was defined. Providers defined with the
 * `@Injectable()` decorator use the class name. Custom Providers may use strings
 * or symbols as the injection token.
 *
 * @param token lookup key for the provider to be injected (assigned to the constructor
 * parameter).
 *
 * @publicApi
 */
export function Inject<T = any>(token?: T): PropertyDecorator & ParameterDecorator {
  const injectCallHasArguments = arguments.length > 0;

  return (target: object, key: string | symbol | undefined, index?: number) => {
    let type = token || Reflect.getMetadata("design:type", target, key as string | symbol);
    /* Try to infer the token in a constructor-based injection */
    if (!type && !injectCallHasArguments) {
      type = Reflect.getMetadata(PARAMTYPES_METADATA, target, key as string | symbol)?.[index as number];
    }

    if (!isUndefined(index)) {
      let dependencies = Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, target) || [];

      dependencies = [...dependencies, { index, param: type }];
      Reflect.defineMetadata(SELF_DECLARED_DEPS_METADATA, dependencies, target);
      return;
    }
    let properties = Reflect.getMetadata(PROPERTY_DEPS_METADATA, target.constructor) || [];

    properties = [...properties, { key, type }];
    Reflect.defineMetadata(PROPERTY_DEPS_METADATA, properties, target.constructor);
  };
}
