import { ArgumentsHost } from "@venok/core/interfaces/context/arguments-host.interface";
import { Logger } from "@venok/core/services/logger.service";
import { RuntimeException } from "@venok/core/errors/exceptions";
import { ExceptionFilter } from "@venok/core/interfaces/features/exception-filter.interface";

export class VenokExceptionFilter<T = any, R = any> implements ExceptionFilter {
  private static readonly logger = new Logger("ExternalExceptionsHandler");

  catch(exception: T, host: ArgumentsHost) {
    if (exception instanceof RuntimeException) {
      return VenokExceptionFilter.logger.error(exception.what(), exception.stack);
    }

    if (exception instanceof Error) return VenokExceptionFilter.logger.error(exception.message, exception.stack);
  }
}
