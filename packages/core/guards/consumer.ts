import { ContextType } from "@venok/core/interfaces/context/arguments-host.interface";
import { isEmpty } from "@venok/core/helpers/shared.helper";
import { ExecutionContextHost } from "@venok/core/context/execution-host";
import { lastValueFrom, Observable } from "rxjs";
import { CanActivate } from "@venok/core/interfaces/features/guards.interface";

export class GuardsConsumer {
  public async tryActivate<TContext extends string = ContextType>(
    guards: CanActivate[],
    args: unknown[],
    instance: object,
    callback: (...args: unknown[]) => unknown,
    type?: TContext,
  ): Promise<boolean> {
    if (!guards || isEmpty(guards)) {
      return true;
    }
    const context = this.createContext(args, instance, callback);
    context.setType<TContext>(type as TContext);

    for (const guard of guards) {
      const result = guard.canActivate(context);
      if (await this.pickResult(result)) {
        continue;
      }
      return false;
    }
    return true;
  }

  public createContext(
    args: unknown[],
    instance: object,
    callback: (...args: unknown[]) => unknown,
  ): ExecutionContextHost {
    return new ExecutionContextHost(args, instance.constructor as any, callback);
  }

  public async pickResult(result: boolean | Promise<boolean> | Observable<boolean>): Promise<boolean> {
    if (result instanceof Observable) {
      return lastValueFrom(result);
    }
    return result;
  }
}
