import { RuntimeException } from "@venok/core/errors/exceptions";
import { ArgumentsHost, ExceptionFilter } from "@venok/core";
import { Logger } from "@venok/core/services/logger.service";

export class VenokExceptionFilter<T = any, R = any> implements ExceptionFilter {
  private static readonly logger = new Logger("ExternalExceptionsHandler");

  catch(exception: T, host: ArgumentsHost) {
    if (exception instanceof RuntimeException) {
      return VenokExceptionFilter.logger.error(exception.what(), exception.stack);
    }

    if (exception instanceof Error) return VenokExceptionFilter.logger.error(exception.message, exception.stack);
  }
}
