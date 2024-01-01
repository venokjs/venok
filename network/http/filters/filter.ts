import {
  ApplicationContext,
  ArgumentsHost,
  ExceptionFilter,
  Inject,
  MESSAGES,
  Optional,
  VenokContainer,
} from "@venok/core";
import { Logger } from "@venok/core/services/logger.service";

import { AbstractHttpAdapter } from "@venok/http/adapter/adapter";
import { HttpConfig, HttpServer, HttpStatus } from "@venok/http";
import { HttpAdapterHost } from "@venok/http/adapter/host";
import { HttpException } from "@venok/http/errors";
import { isObject } from "@venok/core/helpers";

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
      return this.handleUnknownError(exception, host, applicationRef as any);
    }

    const res = exception.getResponse();
    const message = isObject(res)
      ? res
      : {
          statusCode: exception.getStatus(),
          message: res,
        };

    const response = host.getArgByIndex(1);

    if (!applicationRef!.isHeadersSent(response)) applicationRef!.reply(response, message, exception.getStatus());
    else applicationRef!.end(response);
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
