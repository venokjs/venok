import type { IncomingMessage, ServerResponse } from "http";
import type { RawBodyRequest } from "@venok/http";

import type { VenokExpressBodyParserOptions } from "~/interfaces/index.js";

const rawBodyParser = (req: RawBodyRequest<IncomingMessage>, _res: ServerResponse, buffer: Buffer) => {
  if (Buffer.isBuffer(buffer)) {
    req.rawBody = buffer;
  }
  return true;
};

export function getBodyParserOptions<Options = VenokExpressBodyParserOptions>(
  rawBody: boolean,
  options?: Omit<Options, "verify">  
): Options {
  let parserOptions: Options = (options || {}) as Options;

  if (rawBody) {
    parserOptions = {
      ...parserOptions,
      verify: rawBodyParser,
    };
  }

  return parserOptions;
}
