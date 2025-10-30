import type { ExecutionContext } from "~/interfaces/index.js";

import { Observable } from "rxjs";

/**
 * Interface defining the `canActivate()` function that must be implemented
 * by a guard.  Return value indicates whether the current request is
 * allowed to proceed.  Return can be either synchronous (`boolean`)
 * or asynchronous (`Promise` or `Observable`).
 *
 * @publicApi
 */
export interface CanActivate {
  /**
   * @param context Current execution context. Provides access to details about
   * the current request pipeline.
   *
   * @returns Value indicating whether the current request is allowed to
   * proceed.
   */
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean>;
}
