import type { InjectionToken } from "@venok/core/interfaces/modules/index.js";

/**
 * @publicApi
 */
export type OptionalFactoryDependency = {
  token: InjectionToken;
  optional: boolean;
};
