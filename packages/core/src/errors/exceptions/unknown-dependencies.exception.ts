import type { Module } from "~/injector/module/module.js";

import { RuntimeException } from "~/errors/exceptions/runtime.exception.js";
import { UNKNOWN_DEPENDENCIES_MESSAGE } from "~/errors/messages.js";
import type { InjectorDependencyContext } from "~/interfaces/index.js";

export class UnknownDependenciesException extends RuntimeException {
  public readonly moduleRef: { id: string } | undefined;

  constructor(
    public readonly type: string | symbol,
    public readonly context: InjectorDependencyContext,
    moduleRef: Module,
    public readonly metadata?: { id: string },
  ) {
    super(UNKNOWN_DEPENDENCIES_MESSAGE(type, context, moduleRef));
    this.moduleRef = moduleRef && { id: moduleRef.id };
  }
}
