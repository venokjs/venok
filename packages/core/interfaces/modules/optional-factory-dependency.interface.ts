import { InjectionToken } from "@venok/core/interfaces/modules";

/**
 * @publicApi
 */
export type OptionalFactoryDependency = {
  token: InjectionToken;
  optional: boolean;
};
