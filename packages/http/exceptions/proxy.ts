import { ExecutionContextHost } from "@venok/core/context/execution-host";
import { ExternalExceptionsHandler } from "@venok/core/exceptions/external/handler";
import { HttpExceptionsHandler } from "@venok/http/exceptions/handler";

export type RouterProxyCallback = <TRequest, TResponse>(req?: TRequest, res?: TResponse, next?: () => void) => void;

export class HttpProxy {
  public createProxy(targetCallback: RouterProxyCallback, exceptionsHandler: HttpExceptionsHandler) {
    return async <TRequest, TResponse>(req: TRequest, res: TResponse, next: () => void) => {
      try {
        await targetCallback(req, res, next);
      } catch (e) {
        const host = new ExecutionContextHost([req, res, next]);
        exceptionsHandler.next(e, host);
        return res;
      }
    };
  }

  public createExceptionLayerProxy(
    targetCallback: <TError, TRequest, TResponse>(err: TError, req: TRequest, res: TResponse, next: () => void) => void,
    exceptionsHandler: HttpExceptionsHandler,
  ) {
    return async <TError, TRequest, TResponse>(err: TError, req: TRequest, res: TResponse, next: () => void) => {
      try {
        await targetCallback(err, req, res, next);
      } catch (e) {
        const host = new ExecutionContextHost([req, res, next]);
        exceptionsHandler.next(e, host);
        return res;
      }
    };
  }
}
