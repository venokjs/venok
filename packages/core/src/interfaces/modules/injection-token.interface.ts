import type { Abstract, Type } from "~/interfaces/index.js";

/**
 * @publicApi
 */
export type InjectionToken<T = any> = string | symbol | Type<T> | Abstract<T> | Function;
