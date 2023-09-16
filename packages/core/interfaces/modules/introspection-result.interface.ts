import { Scope } from "@venok/core/interfaces";

/**
 * @publicApi
 */
export interface IntrospectionResult {
  /**
   * Enum defining lifetime of host class or factory.
   */
  scope: Scope;
}
