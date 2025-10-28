import { RuntimeException } from "~/errors/exceptions/runtime.exception.js";
import { UNKNOWN_EXPORT_MESSAGE } from "~/errors/messages.js";

export class UnknownExportException extends RuntimeException {
  constructor(token: string | symbol, moduleName: string) {
    super(UNKNOWN_EXPORT_MESSAGE(token, moduleName));
  }
}
