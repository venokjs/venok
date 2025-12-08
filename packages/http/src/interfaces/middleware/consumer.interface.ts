import type { Type } from "@venok/core";
import type { MiddlewareConfigProxy } from "~/interfaces/index.js";

/**
 * Interface defining method for applying user defined middleware to routes.
 *
 * @publicApi
 */
export interface HttpMiddlewareConsumer {
  /**
   * @param {...(Type | Function)} middleware middleware class/function or array of classes/functions
   * to be attached to the passed routes.
   *
   * @returns {MiddlewareConfigProxy}
   */
  apply(...middleware: (Type | Function)[]): MiddlewareConfigProxy;
}
