import { Reflector } from "@venok/core";

/**
 * Request method Decorator. Defines the HTTP response status code.  Overrides
 * default status code for the decorated request method.
 *
 * @param statusCode HTTP response code to be returned by route handler.
 *
 * @publicApi
 */
export const HttpCode = Reflector.createDecorator<number>({ type: "method" });
