import { ContextType } from "@venok/core/interfaces/context/arguments-host.interface";
import { ExecutionContextHost } from "@venok/core/context/execution-host";
import { ExternalExceptionsHandler } from "@venok/core/exceptions/external/handler";

export class ExternalErrorProxy {
  public createProxy<TContext extends string = ContextType>(
    targetCallback: (...args: any[]) => any,
    exceptionsHandler: ExternalExceptionsHandler,
    type?: TContext,
  ) {
    return async (...args: any[]) => {
      try {
        return await targetCallback(...args);
      } catch (e) {
        const host = new ExecutionContextHost(args);
        host.setType<TContext>(type as any);
        return exceptionsHandler.next(e, host);
      }
    };
  }
}
