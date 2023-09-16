import { INVALID_CLASS_SCOPE_MESSAGE } from "../messages";
import { RuntimeException } from "./runtime.exception";
import { Abstract, Type } from "@venok/core/interfaces";
import { isFunction } from "@venok/core/utils/shared.utils";

export class InvalidClassScopeException extends RuntimeException {
  constructor(metatypeOrToken: Type<any> | Abstract<any> | string | symbol) {
    let name = isFunction(metatypeOrToken) ? (metatypeOrToken as Function).name : metatypeOrToken;
    name = name && name.toString();

    super(INVALID_CLASS_SCOPE_MESSAGE`${name}`);
  }
}
