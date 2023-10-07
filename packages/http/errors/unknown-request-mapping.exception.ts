import { Type } from "@venok/core";
import { RuntimeException } from "@venok/core/errors/exceptions";
import { UNKNOWN_REQUEST_MAPPING } from "../exceptions/messages";

export class UnknownRequestMappingException extends RuntimeException {
  constructor(metatype: Type) {
    super(UNKNOWN_REQUEST_MAPPING(metatype));
  }
}
