import type { InjectorDependencyContext } from "../../injector/injector.js";
import { UNKNOWN_DEPENDENCIES_MESSAGE } from "../messages.js";
import { RuntimeException } from "./runtime.exception.js";
import { Module } from "../../injector/module/module.js";

export class UndefinedDependencyException extends RuntimeException {
  constructor(type: string, undefinedDependencyContext: InjectorDependencyContext, module: Module) {
    super(UNKNOWN_DEPENDENCIES_MESSAGE(type, undefinedDependencyContext, module));
  }
}
