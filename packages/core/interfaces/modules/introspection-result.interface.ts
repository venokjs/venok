import { Scope } from "@venok/core/interfaces/index.js";

/**
 * @publicApi
 */
export interface IntrospectionResult {
  /**
   * Enum defining lifetime of host class or factory.
   */
  scope: Scope;
}
