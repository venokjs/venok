import { Logger } from "@venok/core/services/logger.service";
import { RuntimeException } from "@venok/core/errors/exceptions";

export class ExceptionHandler {
  private static readonly logger = new Logger(ExceptionHandler.name);

  public handle(exception: RuntimeException | Error) {
    if (!(exception instanceof RuntimeException)) {
      return ExceptionHandler.logger.error(exception.message, exception.stack);
    }
    return ExceptionHandler.logger.error(exception.what(), exception.stack);
  }
}
