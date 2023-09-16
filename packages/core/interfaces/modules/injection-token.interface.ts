import { Abstract, Type } from "@venok/core/interfaces";

/**
 * @publicApi
 */
export type InjectionToken<T = any> = string | symbol | Type<T> | Abstract<T> | Function;
