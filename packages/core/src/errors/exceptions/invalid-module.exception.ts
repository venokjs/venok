import { RuntimeException } from "~/errors/exceptions/runtime.exception.js";
import { INVALID_MODULE_MESSAGE } from "~/errors/messages.js";

export class InvalidModuleException extends RuntimeException {
  constructor(parentModule: any, index: number, scope: any[]) {
    super(INVALID_MODULE_MESSAGE(parentModule, index, scope));
  }
}
