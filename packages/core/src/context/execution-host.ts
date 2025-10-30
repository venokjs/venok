import type { ContextType, ExecutionContext } from "~/interfaces/context/index.js";
import type { Type } from "~/interfaces/index.js";

export class ExecutionContextHost implements ExecutionContext {
  private contextType: string = "native";

  constructor(
    private readonly args: any[],
    private readonly constructorRef: Type = null as any,
    private readonly handler: Function = null as any
  ) {}

  setType<TContext extends string = ContextType>(type: TContext) {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    type && (this.contextType = type);
  }

  getType<TContext extends string = ContextType>(): TContext {
    return this.contextType as TContext;
  }

  getClass<T = any>(): Type<T> {
    return this.constructorRef;
  }

  getHandler(): Function {
    return this.handler;
  }

  getArgs<T extends Array<any> = any[]>(): T {
    return this.args as T;
  }

  getArgByIndex<T = any>(index: number): T {
    return this.args[index] as T;
  }
}
