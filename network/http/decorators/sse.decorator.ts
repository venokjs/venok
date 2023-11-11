import { METHOD_METADATA, PATH_METADATA, SSE_METADATA } from "../constants";
import { RequestMethod } from "../enums";
import { Reflector } from "@venok/core";

/**
 * Declares this route as a Server-Sent-Events endpoint
 *
 * @publicApi
 */
export const Sse = Reflector.createDecoratorWithAdditionalMetadata<string | undefined, boolean>({
  type: "method",
  key: SSE_METADATA,
  transform: (path) => {
    return {
      value: true,
      additional: {
        [PATH_METADATA]: path && path.length ? path : "/",
        [METHOD_METADATA]: RequestMethod.GET,
      },
    };
  },
});
