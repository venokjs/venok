import { ExceptionHandler } from "~/exceptions/zone/handler.js";
import { Logger } from "~/services/logger.service.js";

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
