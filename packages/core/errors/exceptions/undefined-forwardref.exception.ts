import { UNDEFINED_FORWARDREF_MESSAGE } from "../messages.js";
import { RuntimeException } from "./runtime.exception.js";
import type { Type } from "@venok/core/interfaces/index.js";

export class UndefinedForwardRefException extends RuntimeException {
  constructor(scope: Type[]) {
    super(UNDEFINED_FORWARDREF_MESSAGE(scope));
  }
}
