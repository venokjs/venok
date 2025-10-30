import type { InjectionToken } from "~/interfaces/index.js";

/**
 * @publicApi
 */
export type OptionalFactoryDependency = {
  token: InjectionToken;
  optional: boolean;
};
