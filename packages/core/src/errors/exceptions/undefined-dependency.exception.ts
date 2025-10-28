import type { Module } from "~/injector/module/module.js";

import { RuntimeException } from "~/errors/exceptions/runtime.exception.js";
import { UNKNOWN_DEPENDENCIES_MESSAGE } from "~/errors/messages.js";
import type { InjectorDependencyContext } from "~/interfaces/index.js";

export class UndefinedDependencyException extends RuntimeException {
  constructor(type: string, undefinedDependencyContext: InjectorDependencyContext, module: Module) {
    super(UNKNOWN_DEPENDENCIES_MESSAGE(type, undefinedDependencyContext, module));
  }
}
