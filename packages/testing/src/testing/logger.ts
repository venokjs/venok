import { ConsoleLogger } from "@venok/core";

/**
 * @publicApi
 */
export class TestingLogger extends ConsoleLogger {
  constructor() {
    super("Testing");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  log(message: string) {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  warn(message: string) {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  debug(message: string) {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  verbose(message: string) {}
  error(message: string, ...optionalParams: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return super.error(message, ...optionalParams);
  }
}