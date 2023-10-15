import { RuntimeException } from "@venok/core/errors/exceptions";
import { INVALID_MIDDLEWARE_MESSAGE } from "../exceptions/messages";

export class InvalidMiddlewareException extends RuntimeException {
  constructor(name: string) {
    super(INVALID_MIDDLEWARE_MESSAGE`${name}`);
  }
}
