import type { ArgumentsHost, ExceptionFilter } from "@venok/core";

import { isObject, Logger, MESSAGES } from "@venok/core";
import { WsException } from "~/exceptions/ws.exception.js";
import { WebsocketArgumentsHost } from "~/websocket/arguments-host.js";


export interface ErrorPayload<Cause = { pattern: string; data: unknown }> {
  /**
   * Error message identifier.
   */
  status: "error";
  /**
   * Error message.
   */
  message: string;
  /**
   * Message that caused the exception.
   */
  cause?: Cause;
}

interface BaseWsExceptionFilterOptions {
  /**
   * When true, the data that caused the exception will be included in the response.
   * This is useful when you want to provide additional context to the client, or
   * when you need to associate the error with a specific request.
   * @default true
   */
  includeCause?: boolean;

  /**
   * A factory function that can be used to control the shape of the "cause" object.
   * This is useful when you need a custom structure for the cause object.
   * @default (pattern, data) => ({ pattern, data })
   */
  causeFactory?: (pattern: string, data: unknown) => Record<string, any>;
}

/**
 * @publicApi
 */
export class WebsocketExceptionFilter <T = any> implements ExceptionFilter<T>{
  protected static readonly logger = new Logger("WsExceptionsHandler");

  constructor(protected readonly options: BaseWsExceptionFilterOptions = {}) {
    this.options.includeCause = this.options.includeCause ?? true;
    this.options.causeFactory =
      this.options.causeFactory ?? ((pattern, data) => ({ pattern, data }));
  }

  public catch(exception: any, host: ArgumentsHost) {
    const websocketContext = WebsocketArgumentsHost.create(host);
    const client = websocketContext.getClient<{ emit: Function }>();
    const pattern = websocketContext.getPattern();
    const data = websocketContext.getData();

    this.handleError(client, exception, { pattern, data });
  }

  public handleError<TClient extends { emit: Function }>(
    client: TClient,
    exception: any,
    cause: ErrorPayload["cause"]
  ) {
    if (!(exception instanceof WsException)) return this.handleUnknownError(exception, client, cause);

    const status = "error";
    const result = exception.getError();

    if (isObject(result)) return client.emit("exception", result);

    const payload: ErrorPayload<unknown> = {
      status,
      message: result,
    };

    if (this.options?.includeCause && cause) {
      payload.cause = this.options.causeFactory!(cause.pattern, cause.data);
    }

    client.emit("exception", payload);
  }

  public handleUnknownError<TClient extends { emit: Function }>(
    exception: any,
    client: TClient,
    data: ErrorPayload["cause"]
  ) {
    const status = "error";
    const payload: ErrorPayload<unknown> = {
      status,
      message: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE,
    };

    if (this.options?.includeCause && data) {
      payload.cause = this.options.causeFactory!(data.pattern, data.data);
    }

    client.emit("exception", payload);

    const logger = WebsocketExceptionFilter.logger;
    logger.error(exception);
  }

  public isExceptionObject(err: any): err is Error {
    return isObject(err) && !!(err as Error).message;
  }
}