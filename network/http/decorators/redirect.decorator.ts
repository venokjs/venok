import { REDIRECT_METADATA } from "../constants";
import { Reflector } from "@venok/core";

export type RedirectOptions = { url: string; statusCode?: number };

/**
 * Redirects request to the specified URL.
 *
 * @publicApi
 */
const internalRedirect = Reflector.createDecorator<RedirectOptions>({
  type: "method",
  key: REDIRECT_METADATA,
  transform: (options) => options,
});

export const Redirect = (url: string, statusCode?: number) => internalRedirect({ url, statusCode });
