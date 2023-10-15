import { RouteInfo } from "./configuration.interface";
import { Type } from "@venok/core";
import { MiddlewareConsumer } from "./consumer.interface";

/**
 * @publicApi
 */
export interface MiddlewareConfigProxy {
  /**
   * Excludes routes from the currently processed middleware.
   *
   * @param {(string | RouteInfo)[]} routes
   * @returns {MiddlewareConfigProxy}
   */
  exclude(...routes: (string | RouteInfo)[]): MiddlewareConfigProxy;

  /**
   * Attaches passed either routes or controllers to the currently configured middleware.
   * If you pass a class, Venok would attach middleware to every path defined within this controller.
   *
   * @param {(string | Type | RouteInfo)[]} routes
   * @returns {MiddlewareConsumer}
   */
  forRoutes(...routes: (string | Type | RouteInfo)[]): MiddlewareConsumer;
}
