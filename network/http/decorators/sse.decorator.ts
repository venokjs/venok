import { METHOD_METADATA, PATH_METADATA, SSE_METADATA } from "../constants";
import { RequestMethod } from "../enums";
import { Reflector } from "@venok/core";

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
