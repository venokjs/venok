import { extendArrayMetadata } from "@venok/core";
import { HEADERS_METADATA } from "~/constants.js";

/**
 * Request method Decorator.  Sets a response header.
 *
 * For example:
 * `@Header('Cache-Control', 'none')`
 *
 * @param name string to be used for header name
 * @param value string to be used for header value
 *
 * @publicApi
 */
export function Header(name: string, value: string): MethodDecorator {
  return (target: object, key: string | symbol, descriptor: TypedPropertyDescriptor<any>) => {
    extendArrayMetadata(HEADERS_METADATA, [{ name, value }], descriptor.value as Function);
    return descriptor;
  };
}
