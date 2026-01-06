import type { ExceptionFilter } from "@venok/core";

import { isObject, Logger, MESSAGES } from "@venok/core";
import { Observable, throwError } from "rxjs";
import { MicroserviceException } from "~/exceptions/microservice.exception.js";


/**
 * @publicApi
 */
export class MicroserviceExceptionFilter<T = any, R = any> implements ExceptionFilter<T> {
  private static readonly logger = new Logger("MicroserviceExceptionFilter");

  public catch(exception: T): Observable<R> {
    const status = "error";
    if (!(exception instanceof MicroserviceException)) {
      return this.handleUnknownError(exception, status);
    }
    const res = exception.getError();
    const message = isObject(res) ? res : { status, message: res };
    return throwError(() => message);
  }

  public handleUnknownError(exception: T, status: string) {
    const errorMessage = MESSAGES.UNKNOWN_EXCEPTION_MESSAGE;

    return throwError(() => ({ status, message: errorMessage }));
  }

  public isError(exception: any): exception is Error {
    return !!(isObject(exception) && (exception as Error).message);
  }
}