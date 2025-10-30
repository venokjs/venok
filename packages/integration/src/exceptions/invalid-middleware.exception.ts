import { RuntimeException } from "@venok/core";

import { INVALID_MIDDLEWARE_MESSAGE } from "~/exceptions/messages.js";

export class InvalidMiddlewareException extends RuntimeException {
  constructor(name: string) {
    super(INVALID_MIDDLEWARE_MESSAGE`${name}`);
  }
}
