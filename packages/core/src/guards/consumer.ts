import { lastValueFrom, Observable } from "rxjs";

import type { CanActivate, ContextType } from "~/interfaces/index.js";

import { ExecutionContextHost } from "~/context/execution-host.js";

import { isEmpty } from "~/helpers/shared.helper.js";

export class GuardsConsumer {
  public async tryActivate<TContext extends string = ContextType>(
    guards: CanActivate[],
    args: unknown[],
    instance: object,
    callback: (...args: unknown[]) => unknown,
    type?: TContext,
  ): Promise<boolean> {
    if (!guards || isEmpty(guards)) return true;

    const context = this.createContext(args, instance, callback);
    context.setType<TContext>(type as TContext);

    for (const guard of guards) {
      const result = guard.canActivate(context);
      if (typeof result === "boolean") {
        if (!result) return false;
        continue;
      }

      if (await this.pickResult(result)) continue;

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
    if (result instanceof Observable) return lastValueFrom(result);

    return result;
  }
}
