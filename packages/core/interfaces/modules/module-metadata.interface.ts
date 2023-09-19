import { Abstract, Type } from "@venok/core/interfaces";
import { DynamicModule, Provider, ForwardReference } from "@venok/core/interfaces/modules";

/**
 * Interface defining the property object that describes the module.
 *
 * @publicApi
 */
export interface ModuleMetadata {
  /**
   * Optional list of imported modules that export the providers which are
   * required in this module.
   */
  imports?: Array<Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference>;
  /**
   * Optional list of controllers defined in this module which have to be
   * instantiated.
   */
  controllers?: Type<any>[];
  /**
   * Optional list of providers that will be instantiated by the Venok injector
   * and that may be shared at least across this module.
   */
  providers?: Provider[];
  /**
   * Optional list of the subset of providers that are provided by this module
   * and should be available in other modules which import this module.
   */
  exports?: Array<
    DynamicModule | Promise<DynamicModule> | string | symbol | Provider | ForwardReference | Abstract<any> | Function
  >;
}
