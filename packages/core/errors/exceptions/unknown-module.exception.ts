import { RuntimeException } from "./runtime.exception";

export class UnknownModuleException extends RuntimeException {
  constructor() {
    super("Venok could not select the given module (it does not exist in current context)");
  }
}
