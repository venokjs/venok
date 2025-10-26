import type { Abstract, Type } from "@venok/core/interfaces/index.js";

/**
 * @publicApi
 */
export type InjectionToken<T = any> = string | symbol | Type<T> | Abstract<T> | Function;
