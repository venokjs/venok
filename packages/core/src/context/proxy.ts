import type { ContextType } from "~/interfaces/index.js";

import { catchError, isObservable } from "rxjs";

import { VenokExceptionsHandler } from "~/exceptions/handler.js";
import { ExecutionContextHost } from "~/context/execution-host.js";

export class VenokProxy {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public createProxy<TContext extends string = ContextType>(
    targetCallback: (...args: any[]) => any,
    exceptionsHandler: VenokExceptionsHandler,
    type: ContextType = "native"
  ) {
    return async (...args: any[]) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const result = await targetCallback(...args);
        return !isObservable(result)
          ? result
          : result.pipe(catchError((error: any) => this.handleError(exceptionsHandler, args, error, type)));
      } catch (error) {
        return this.handleError(exceptionsHandler, args, error, type);
      }
    };
  }

  protected handleError<T>(
    exceptionsHandler: VenokExceptionsHandler,
    args: any[],
    error: T,
    type: ContextType = "native"
  ) {
    const host = new ExecutionContextHost(args);
    host.setType<ContextType>(type);
    exceptionsHandler.next(error, host);
    return args;
  }
}
