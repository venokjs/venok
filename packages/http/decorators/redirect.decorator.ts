import { REDIRECT_METADATA } from "@venok/http/constants";

/**
 * Redirects request to the specified URL.
 *
 * @publicApi
 */
export function Redirect(url = "", statusCode?: number): MethodDecorator {
  return (target: object, key: string | symbol, descriptor: TypedPropertyDescriptor<any>) => {
    Reflect.defineMetadata(REDIRECT_METADATA, { statusCode, url }, descriptor.value);
    return descriptor;
  };
}
