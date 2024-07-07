import { ContextType } from "@venok/core/interfaces/context/arguments-host.interface";
import { isEmpty } from "@venok/core/helpers/shared.helper";
import { defer, mergeAll, Observable, switchMap } from "rxjs";
import { AsyncResource } from "node:async_hooks";
import { fromPromise } from "rxjs/internal/observable/innerFrom";
import { ExecutionContextHost } from "@venok/core/context/execution-host";
import { Type } from "@venok/core/interfaces";
import { CallHandler, VenokInterceptor } from "@venok/core/interfaces/features/interceptor.interface";

export class InterceptorsConsumer {
  public async intercept<TContext extends string = ContextType>(
    interceptors: VenokInterceptor[],
    args: unknown[],
    instance: object,
    callback: (...args: unknown[]) => unknown,
    next: () => Promise<unknown>,
    type?: TContext,
  ): Promise<unknown> {
    if (isEmpty(interceptors)) {
      return next();
    }
    const context = this.createContext(args, instance, callback);
    context.setType<TContext>(type as TContext);

    const nextFn = async (i = 0) => {
      if (i >= interceptors.length) {
        return defer(AsyncResource.bind(() => this.transformDeferred(next)));
      }
      const handler: CallHandler = {
        handle: () => defer(AsyncResource.bind(() => nextFn(i + 1))).pipe(mergeAll()),
      };
      return interceptors[i].intercept(context, handler);
    };
    return defer(() => nextFn()).pipe(mergeAll());
  }

  public createContext(
    args: unknown[],
    instance: object,
    callback: (...args: unknown[]) => unknown,
  ): ExecutionContextHost {
    return new ExecutionContextHost(args, instance.constructor as Type, callback);
  }

  public transformDeferred(next: () => Promise<any>): Observable<any> {
    return fromPromise(next()).pipe(
      switchMap((res) => {
        const isDeferred = res instanceof Promise || res instanceof Observable;
        return isDeferred ? res : Promise.resolve(res);
      }),
    );
  }
}
