import { ModuleMetadata } from "@venok/core/interfaces/modules";
import { Type } from "@venok/core/interfaces";

/**
 * Interface defining a Dynamic Module.
 *
 * @publicApi
 */
export interface DynamicModule extends ModuleMetadata {
  /**
   * A module reference
   */
  module: Type;

  /**
   * When "true", makes a module global-scoped.
   *
   * Once imported into any module, a global-scoped module will be visible
   * in all modules. Thereafter, modules that wish to inject a service exported
   * from a global module do not need to import the provider module.
   *
   * @default false
   */
  global?: boolean;
}
