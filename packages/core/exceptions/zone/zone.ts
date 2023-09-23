import { ExceptionHandler } from "@venok/core/exceptions/zone/handler";
import { Logger } from "@venok/core/services/logger.service";

const DEFAULT_TEARDOWN = () => process.exit(1);

export class ExceptionsZone {
  private static readonly exceptionHandler = new ExceptionHandler();

  public static run(callback: () => void, teardown: (err: any) => void = DEFAULT_TEARDOWN, autoFlushLogs?: boolean) {
    try {
      callback();
    } catch (e) {
      this.exceptionHandler.handle(e as any);
      if (autoFlushLogs) Logger.flush();
      teardown(e);
    }
  }

  public static async asyncRun(
    callback: () => Promise<void>,
    teardown: (err: any) => void = DEFAULT_TEARDOWN,
    autoFlushLogs?: boolean,
  ) {
    try {
      await callback();
    } catch (e) {
      this.exceptionHandler.handle(e as any);
      if (autoFlushLogs) Logger.flush();
      teardown(e);
    }
  }
}
