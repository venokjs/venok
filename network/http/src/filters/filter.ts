import type { ArgumentsHost, ExceptionFilter } from "@venok/core";

import type { AbstractHttpAdapter } from "~/adapter/adapter.js";
import type { HttpAdapterHost } from "~/adapter/host.js";
import type { HttpServer } from "~/interfaces/index.js";

import { ApplicationContext, Inject, isObject, Logger, MESSAGES, Optional, VenokContainer } from "@venok/core";

import { HttpConfig } from "~/application/config.js";
import { HttpStatus } from "~/enums/http-status.enum.js";
import { HttpException } from "~/errors/http.exception.js";

export class HttpExceptionFilter<T = any> implements ExceptionFilter<T> {
  private static readonly logger = new Logger("ExceptionsHandler");

  @Optional()
  @Inject()
  protected readonly httpAdapterHost?: HttpAdapterHost;

  private readonly context: ApplicationContext;

  constructor(protected readonly container: VenokContainer) {
    const context = new ApplicationContext(container, container.applicationConfig);
    context.selectContextModule();
    this.context = context;
  }

  catch(exception: T, host: ArgumentsHost) {
    const applicationRef = this.context.get(HttpConfig).getHttpAdapterRef();
    // const applicationRef = this.applicationRef || (this.httpAdapterHost && this.httpAdapterHost.httpAdapter);

    if (!(exception instanceof HttpException)) {
      return this.handleUnknownError(exception, host, applicationRef);
    }

    const res = exception.getResponse();
    const message = isObject(res)
      ? res
      : {
          statusCode: exception.getStatus(),
          message: res,
        };

    const response = host.getArgByIndex(1);

    if (!applicationRef.isHeadersSent(response)) applicationRef.reply(response, message, exception.getStatus());
    else applicationRef.end(response);
  }

  public handleUnknownError(exception: T, host: ArgumentsHost, applicationRef: AbstractHttpAdapter | HttpServer) {
    const body = this.isHttpError(exception)
      ? {
          statusCode: exception.statusCode,
          message: exception.message,
        }
      : {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE,
        };

    const response = host.getArgByIndex(1);

    if (!applicationRef.isHeadersSent(response)) applicationRef.reply(response, body, body.statusCode);
    else applicationRef.end(response);

    if (this.isExceptionObject(exception)) return HttpExceptionFilter.logger.error(exception.message, exception.stack);

    return HttpExceptionFilter.logger.error(exception);
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
