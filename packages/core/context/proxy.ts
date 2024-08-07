import { catchError, isObservable } from "rxjs";

import { ContextType } from "@venok/core/interfaces";
import { ExecutionContextHost } from "@venok/core/context/execution-host";
import { VenokExceptionsHandler } from "@venok/core/exceptions/handler";

export class VenokProxy {
  public createProxy<TContext extends string = ContextType>(
    targetCallback: (...args: any[]) => any,
    exceptionsHandler: VenokExceptionsHandler,
    type: ContextType = "native",
  ) {
    return async (...args: any[]) => {
      try {
        const result = await targetCallback(...args);
        return !isObservable(result)
          ? result
          : result.pipe(catchError((error) => this.handleError(exceptionsHandler, args, error, type)));
      } catch (error) {
        return this.handleError(exceptionsHandler, args, error, type);
      }
    };
  }

  private handleError<T>(
    exceptionsHandler: VenokExceptionsHandler,
    args: any[],
    error: T,
    type: ContextType = "native",
  ) {
    const host = new ExecutionContextHost(args);
    host.setType<ContextType>(type);
    exceptionsHandler.next(error, host);
    return args;
  }

  public createExceptionLayerProxy<TContext extends string = ContextType>(
    targetCallback: <TError>(err: TError, ...args: any[]) => void,
    exceptionsHandler: VenokExceptionsHandler,
    type?: TContext,
  ) {
    return async <TError>(err: TError, req: any, res: any, next: any) => {
      try {
        await targetCallback(err, req, res, next);
      } catch (e) {
        const host = new ExecutionContextHost([req, res, next]);
        host.setType<TContext>(type as any);
        exceptionsHandler.next(e, host);
        return res;
      }
    };
  }
}
