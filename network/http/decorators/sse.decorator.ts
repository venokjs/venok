import { Reflector } from "@venok/core";
import { METHOD_METADATA, PATH_METADATA } from "@venok/http/constants.js";
import { RequestMethod } from "@venok/http/enums/index.js";

type SseDecorator = {
  [PATH_METADATA]: string;
  [METHOD_METADATA]: RequestMethod;
};

/**
 * Declares this route as a Server-Sent-Events endpoint
 *
 * @publicApi
 */
export const Sse = Reflector.createMetadataDecorator<string | undefined, SseDecorator>({
  type: "method",
  transform: (path) => {
    return {
      [PATH_METADATA]: path && path.length ? path : "/",
      [METHOD_METADATA]: RequestMethod.GET,
    };
  },
});
