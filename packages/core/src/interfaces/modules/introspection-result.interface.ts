import { Scope } from "~/enums/scope.enum.js";

/**
 * @publicApi
 */
export interface IntrospectionResult {
  /**
   * Enum defining lifetime of host class or factory.
   */
  scope: Scope;
}
