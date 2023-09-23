import { ArgumentsHost } from "@venok/core/interfaces/context/arguments-host.interface";
import { Logger } from "@venok/core/services/logger.service";
import { RuntimeException } from "@venok/core/errors/exceptions";

export class ExternalExceptionFilter<T = any, R = any> {
  private static readonly logger = new Logger("ExternalExceptionsHandler");

  catch(exception: T, host: ArgumentsHost) {
    if (exception instanceof RuntimeException) {
      return ExternalExceptionFilter.logger.error(exception.what(), exception.stack);
    }

    if (exception instanceof Error) return ExternalExceptionFilter.logger.error(exception.message, exception.stack);
  }
}
