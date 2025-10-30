import { RuntimeException } from "@venok/core/errors/exceptions/index.js";
import { INVALID_MIDDLEWARE_CONFIGURATION } from "../exceptions/messages.js";

export class InvalidMiddlewareConfigurationException extends RuntimeException {
  constructor() {
    super(INVALID_MIDDLEWARE_CONFIGURATION);
  }
}
