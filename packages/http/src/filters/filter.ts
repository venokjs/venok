import type { ArgumentsHost, ExceptionFilter } from "@venok/core";

import type { AbstractHttpAdapter } from "~/http/adapter.js";

import { ApplicationContext, isObject, Logger, MESSAGES, VenokContainer } from "@venok/core";

import { HttpException } from "~/exceptions/http.exception.js";
import { HttpStatus } from "~/enums/status.enum.js";
import { HttpConfig } from "~/http/config.js";


export class HttpExceptionFilter<T = any> implements ExceptionFilter<T> {
  private static readonly logger = new Logger("ExceptionsHandler");

  private readonly context: ApplicationContext;

  constructor(protected readonly container: VenokContainer) {
    this.context = new ApplicationContext(container, container.applicationConfig);
  }

  catch(exception: T, host: ArgumentsHost) {
    const applicationRef = this.context.get(HttpConfig).getHttpAdapterRef();
    const isStandardHttpException = exception instanceof HttpException;
    if (!isStandardHttpException) return this.handleUnknownError(exception, host, applicationRef);

    const res = exception.getInfo();
    const message = isObject(res) ? res : { statusCode: exception.getStatus(), error: res };

    const ctx: any[] = host.getArgByIndex(0);
    applicationRef.setResponseReply(ctx, message, exception.getStatus());
  }

  public handleUnknownError(exception: T, host: ArgumentsHost, applicationRef: AbstractHttpAdapter) {
    const body = this.isHttpError(exception)
      ? { statusCode: exception.statusCode, error: exception.message }
      : { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, error: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE };

    const ctx: any[] = host.getArgByIndex(0);
    applicationRef.setResponseReply(ctx, body, body.statusCode);
    
    return this.isExceptionObject(exception)
      ? HttpExceptionFilter.logger.error(exception.message, exception.stack)
      : HttpExceptionFilter.logger.error(exception);
  }

  public isExceptionObject(err: any): err is Error {
    return isObject(err) && !!(err as Error).message;
  }

  /**
   * Checks if the thrown error comes from the "http-errors" library.
   * @param err error object
   */
  public isHttpError(err: any): err is { statusCode: number; message: string } {
    return err?.statusCode && err?.message;
  }
}
