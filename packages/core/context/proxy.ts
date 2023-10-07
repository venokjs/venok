import { ContextType } from "@venok/core/interfaces";
import { ExecutionContextHost } from "@venok/core/context/execution-host";
import { VenokExceptionsHandler } from "@venok/core/exceptions/handler";

export class VenokProxy {
  public createProxy<TContext extends string = ContextType>(
    targetCallback: (...args: any[]) => any,
    exceptionsHandler: VenokExceptionsHandler,
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
