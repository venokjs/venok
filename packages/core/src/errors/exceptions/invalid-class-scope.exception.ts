import type { Abstract, Type } from "~/interfaces/index.js";

import { RuntimeException } from "~/errors/exceptions/runtime.exception.js";
import { INVALID_CLASS_SCOPE_MESSAGE } from "~/errors/messages.js";

import { isFunction } from "~/helpers/shared.helper.js";

export class InvalidClassScopeException extends RuntimeException {
  constructor(metatypeOrToken: Type | Abstract<any> | string | symbol) {
    let name = isFunction(metatypeOrToken) ? (metatypeOrToken as Function).name : metatypeOrToken;
    name = name && name.toString();

    super(INVALID_CLASS_SCOPE_MESSAGE`${name}`);
  }
}
