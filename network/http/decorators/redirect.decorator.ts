import { REDIRECT_METADATA } from "../constants";
import { Reflector } from "@venok/core";

/**
 * Redirects request to the specified URL.
 *
 * @publicApi
 */
const internalRedirect = Reflector.createDecorator<{ url: string; statusCode?: number }>({
  type: "method",
  key: REDIRECT_METADATA,
  transform: (options) => options,
});

export const Redirect = (url: string, statusCode?: number) => internalRedirect({ url, statusCode });
