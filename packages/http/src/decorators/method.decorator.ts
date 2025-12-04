import { Reflector } from "@venok/core";

import { METHOD_METADATA, PATH_METADATA } from "~/constants.js";
import { HttpMethod } from "~/enums/method.enum.js";

export interface MethodMappingMetadata {
  path?: string | string[];
  method?: HttpMethod;
}

type RequestMappingDecorator = {
  [PATH_METADATA]: string | string[];
  [METHOD_METADATA]: HttpMethod;
};

const defaultMetadata = {
  [PATH_METADATA]: "/",
  [METHOD_METADATA]: HttpMethod.GET,
};

export const MethodMapping = Reflector.createMetadataDecorator<MethodMappingMetadata, RequestMappingDecorator>({
  type: "method",
  transform: (metadata = defaultMetadata) => {
    const pathMetadata = metadata[PATH_METADATA];
    const path = pathMetadata && pathMetadata.length ? pathMetadata : "/";
    const requestMethod = metadata[METHOD_METADATA] || HttpMethod.GET;

    return { [PATH_METADATA]: path, [METHOD_METADATA]: requestMethod };
  },
});

const createMappingDecorator = (method: HttpMethod) => {
  return (path?: string | string[]): MethodDecorator => MethodMapping({ [PATH_METADATA]: path, [METHOD_METADATA]: method });
};
    

/**
 * Route handler (method) Decorator. Routes HTTP POST requests to the specified path.
 *
 * @publicApi
 */
export const Post = createMappingDecorator(HttpMethod.POST);

/**
 * Route handler (method) Decorator. Routes HTTP GET requests to the specified path.
 *
 * @publicApi
 */
export const Get = createMappingDecorator(HttpMethod.GET);

/**
 * Route handler (method) Decorator. Routes HTTP DELETE requests to the specified path.
 *
 * @publicApi
 */
export const Delete = createMappingDecorator(HttpMethod.DELETE);

/**
 * Route handler (method) Decorator. Routes HTTP PUT requests to the specified path.
 *
 * @publicApi
 */
export const Put = createMappingDecorator(HttpMethod.PUT);

/**
 * Route handler (method) Decorator. Routes HTTP PATCH requests to the specified path.
 *
 * @publicApi
 */
export const Patch = createMappingDecorator(HttpMethod.PATCH);

/**
 * Route handler (method) Decorator. Routes HTTP OPTIONS requests to the specified path.
 *
 * @publicApi
 */
export const Options = createMappingDecorator(HttpMethod.OPTIONS);

/**
 * Route handler (method) Decorator. Routes HTTP HEAD requests to the specified path.
 *
 * @publicApi
 */
export const Head = createMappingDecorator(HttpMethod.HEAD);

/**
 * Route handler (method) Decorator. Routes all HTTP requests to the specified path.
 *
 * @publicApi
 */
export const All = createMappingDecorator(HttpMethod.ALL);

/**
 * Route handler (method) Decorator. Routes all HTTP requests to the specified path.
 *
 * @publicApi
 */
export const Search = createMappingDecorator(HttpMethod.SEARCH);
