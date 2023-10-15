import type { IncomingMessage, ServerResponse } from "http";
import { VenokExpressBodyParserOptions } from "../../interfaces";
import { RawBodyRequest } from "@venok/http/interfaces/http/raw-request";

const rawBodyParser = (req: RawBodyRequest<IncomingMessage>, _res: ServerResponse, buffer: Buffer) => {
  if (Buffer.isBuffer(buffer)) {
    req.rawBody = buffer;
  }
  return true;
};

export function getBodyParserOptions<Options = VenokExpressBodyParserOptions>(
  rawBody: boolean,
  options?: Omit<Options, "verify"> | undefined,
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
