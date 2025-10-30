import type { ArgumentsHost, ExceptionFilter } from "~/interfaces/index.js";

import { Logger } from "~/services/logger.service.js";

import { RuntimeException } from "~/errors/exceptions/runtime.exception.js";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class VenokExceptionFilter<T = any, R = any> implements ExceptionFilter {
  private static readonly logger = new Logger("ExternalExceptionsHandler");

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  catch(exception: T, host: ArgumentsHost) {
    if (exception instanceof RuntimeException) {
      return VenokExceptionFilter.logger.error(exception.what(), exception.stack);
    }

    if (exception instanceof Error) return VenokExceptionFilter.logger.error(exception.message, exception.stack);
  }
}
