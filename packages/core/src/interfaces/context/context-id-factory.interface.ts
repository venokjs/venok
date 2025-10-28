import type { ContextId, HostComponentInfo } from "~/interfaces/index.js";

export type ContextIdResolverFn = (info: HostComponentInfo) => ContextId;

export interface ContextIdResolver {
  /**
   * Payload associated with the custom context id
   */
  payload: unknown;
  /**
   * A context id resolver function
   */
  resolve: ContextIdResolverFn;
}

export interface ContextIdStrategy<T = any> {
  /**
   * Allows to attach a parent context id to the existing child context id.
   * This lets you construct durable DI subtrees that can be shared between contexts.
   * @param contextId auto-generated child context id
   * @param request request object
   */
  attach(contextId: ContextId, request: T): ContextIdResolverFn | ContextIdResolver | undefined;
}
