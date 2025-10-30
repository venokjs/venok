import { RuntimeException } from "~/errors/exceptions/runtime.exception.js";
import { INVALID_CLASS_MESSAGE } from "~/errors/messages.js";

export class InvalidClassException extends RuntimeException {
  constructor(value: any) {
    super(INVALID_CLASS_MESSAGE`${value}`);
  }
}
