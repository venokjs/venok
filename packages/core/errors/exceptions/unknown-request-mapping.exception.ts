import type { Type } from "@venok/core/interfaces";
import { RuntimeException } from "./runtime.exception";
import { UNKNOWN_REQUEST_MAPPING } from "../messages";

export class UnknownRequestMappingException extends RuntimeException {
  constructor(metatype: Type) {
    super(UNKNOWN_REQUEST_MAPPING(metatype));
  }
}
