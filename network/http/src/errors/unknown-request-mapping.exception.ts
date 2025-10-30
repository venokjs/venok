import type { Type } from "@venok/core";
import { RuntimeException } from "@venok/core/errors/exceptions/index.js";
import { UNKNOWN_REQUEST_MAPPING } from "../exceptions/messages.js";

export class UnknownRequestMappingException extends RuntimeException {
  constructor(metatype: Type) {
    super(UNKNOWN_REQUEST_MAPPING(metatype));
  }
}
