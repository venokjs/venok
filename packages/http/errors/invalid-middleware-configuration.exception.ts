import { RuntimeException } from "@venok/core/errors/exceptions";
import { INVALID_MIDDLEWARE_CONFIGURATION } from "../exceptions/messages";

export class InvalidMiddlewareConfigurationException extends RuntimeException {
  constructor() {
    super(INVALID_MIDDLEWARE_CONFIGURATION);
  }
}
