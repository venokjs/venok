import { Type } from "@venok/core";
import { MiddlewareConfigProxy } from "./config-proxy.interface";

/**
 * Interface defining method for applying user defined middleware to routes.
 *
 * @publicApi
 */
export interface MiddlewareConsumer {
  /**
   * @param {...(Type | Function)} middleware middleware class/function or array of classes/functions
   * to be attached to the passed routes.
   *
   * @returns {MiddlewareConfigProxy}
   */
  apply(...middleware: (Type | Function)[]): MiddlewareConfigProxy;
}
