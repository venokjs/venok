import { RuntimeException } from "~/errors/exceptions/runtime.exception.js";
import { INVALID_EXCEPTION_FILTER } from "~/errors/messages.js";

export class InvalidExceptionFilterException extends RuntimeException {
  constructor() {
    super(INVALID_EXCEPTION_FILTER);
  }
}
