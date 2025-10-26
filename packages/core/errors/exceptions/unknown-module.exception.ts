import { RuntimeException } from "./runtime.exception.js";

export class UnknownModuleException extends RuntimeException {
  constructor(moduleName?: string) {
    super(
      `Venok could not select the given module (${
        moduleName ? `"${moduleName}"` : "it"
      } does not exist in current context).`,
    );
  }
}
