import { RuntimeException } from "~/errors/exceptions/runtime.exception.js";
import { UNDEFINED_MODULE_MESSAGE } from "~/errors/messages.js";

export class UndefinedModuleException extends RuntimeException {
  constructor(parentModule: any, index: number, scope: any[]) {
    super(UNDEFINED_MODULE_MESSAGE(parentModule, index, scope));
  }
}
