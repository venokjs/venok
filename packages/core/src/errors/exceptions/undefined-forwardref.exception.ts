import type { Type } from "~/interfaces/index.js";

import { RuntimeException } from "~/errors/exceptions/runtime.exception.js";
import { UNDEFINED_FORWARDREF_MESSAGE } from "~/errors/messages.js";

export class UndefinedForwardRefException extends RuntimeException {
  constructor(scope: Type[]) {
    super(UNDEFINED_FORWARDREF_MESSAGE(scope));
  }
}
