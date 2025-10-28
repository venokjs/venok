import { RuntimeException } from "~/errors/exceptions/runtime.exception.js";
import { Logger } from "~/services/logger.service.js";

export class ExceptionHandler {
  private static readonly logger = new Logger(ExceptionHandler.name);

  public handle(exception: RuntimeException | Error) {
    return ExceptionHandler.logger.error(exception);
  }
}
