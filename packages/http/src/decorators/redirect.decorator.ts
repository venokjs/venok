import { Reflector } from "@venok/core";

import { REDIRECT_METADATA } from "~/constants.js";

export type RedirectOptions = { url: string; statusCode?: number };

/**
 * Redirects to the specified URL.
 *
 * @publicApi
 */
const internalRedirect = Reflector.createDecorator<RedirectOptions>({
  type: "method",
  key: REDIRECT_METADATA,
  transform: (options) => options,
});

export const Redirect = (url: string, statusCode?: number) => internalRedirect({ url, statusCode });
