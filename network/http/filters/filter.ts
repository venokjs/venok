import { ExceptionFilter } from "@venok/core/interfaces/features/exception-filter.interface";
import { Logger } from "@venok/core/services/logger.service";
import { Inject, Optional } from "@venok/core";
import { ArgumentsHost } from "@venok/core/interfaces/context/arguments-host.interface";
import { isObject } from "@venok/core/helpers/shared.helper";
import { MESSAGES } from "@venok/core/constants";
import { HttpStatus } from "../enums";
import { HttpServer } from "../interfaces";
import { HttpAdapterHost } from "../adapter/host";
import { AbstractHttpAdapter } from "../adapter/adapter";
import { HttpException } from "../errors";

export class HttpExceptionFilter<T = any> implements ExceptionFilter<T> {
  private static readonly logger = new Logger("ExceptionsHandler");

  @Optional()
  @Inject()
  protected readonly httpAdapterHost?: HttpAdapterHost;

  constructor(protected readonly applicationRef?: HttpServer) {}

  catch(exception: T, host: ArgumentsHost) {
    const applicationRef = this.applicationRef || (this.httpAdapterHost && this.httpAdapterHost.httpAdapter);

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
