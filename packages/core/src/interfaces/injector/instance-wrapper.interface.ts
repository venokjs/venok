import type { InjectionToken } from "~/interfaces/index.js";

export interface HostComponentInfo {
  /**
   * Injection token (or class reference)
   */
  token: InjectionToken;
  /**
   * Flag that indicates whether DI subtree is durable
   */
  isTreeDurable: boolean;
}

export interface ContextId {
  readonly id: number;
  payload?: unknown;
  getParent?(info: HostComponentInfo): ContextId;
}

export interface InstancePerContext<T> {
  instance: T | undefined;
  isResolved?: boolean;
  isPending?: boolean;
  donePromise?: Promise<unknown>;
  isConstructorCalled?: boolean;
}
