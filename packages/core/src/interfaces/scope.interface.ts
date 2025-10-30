import { Scope } from "~/enums/scope.enum.js";

/**
 * @publicApi
 */
export interface ScopeOptions {
  /**
   * Specifies the lifetime of an injected Provider or Controller.
   */
  scope?: Scope;
  /**
   * Flags provider as durable. This flag can be used in combination with custom context id
   * factory strategy to construct lazy DI subtrees.
   *
   * This flag can be used only in conjunction with scope = Scope.REQUEST.
   */
  durable?: boolean;
}
