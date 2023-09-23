import { Type } from "@venok/core/interfaces";
import { ExecutionContext } from "@venok/core/interfaces/context/execution.interface";
import { ContextType } from "@venok/core/interfaces/context/arguments-host.interface";

export class ExecutionContextHost implements ExecutionContext {
  private contextType: string = "native";

  constructor(
    private readonly args: any[],
    private readonly constructorRef: Type<any> = null as any,
    private readonly handler: Function = null as any,
  ) {}

  setType<TContext extends string = ContextType>(type: TContext) {
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
