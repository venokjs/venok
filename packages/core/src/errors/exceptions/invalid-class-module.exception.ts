import { RuntimeException } from "~/errors/exceptions/runtime.exception.js";
import { USING_INVALID_CLASS_AS_A_MODULE_MESSAGE } from "~/errors/messages.js";

export class InvalidClassModuleException extends RuntimeException {
  constructor(metatypeUsedAsAModule: any, scope: any[]) {
    super(USING_INVALID_CLASS_AS_A_MODULE_MESSAGE(metatypeUsedAsAModule, scope));
  }
}
