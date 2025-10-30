import { Reflector } from "@venok/core";
import { METHOD_METADATA, PATH_METADATA } from "~/constants.js";
import { RequestMethod } from "~/enums/request-method.enum.js";

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
