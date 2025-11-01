import { beforeEach, beforeAll, afterAll, describe, expect, it, spyOn, mock } from "bun:test";
import { ExceptionsZone } from "~/exceptions/zone/zone.js";
import { Logger } from "~/services/logger.service.js";

describe("ExceptionsZone", () => {
  const rethrow = (err: any) => {
    throw err;
  };

  describe("run", () => {
    let callback: ReturnType<typeof mock>;
    beforeEach(() => {
      callback = mock(() => {});
    });
    it("should call callback", () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      ExceptionsZone.run(callback as any, rethrow, false);
      expect(callback).toHaveBeenCalled();
    });
    describe("when callback throws exception", () => {
      const exceptionHandler = {
        handle: () => {},
      };
      let handleSpy: ReturnType<typeof spyOn>;
      let LoggerFlushSpy: ReturnType<typeof spyOn>;
      beforeAll(() => {
        (ExceptionsZone as any).exceptionHandler = exceptionHandler;
        handleSpy = spyOn(exceptionHandler, "handle");
        LoggerFlushSpy = spyOn(Logger, "flush");
      });
      afterAll(() => {
        LoggerFlushSpy.mockRestore();
      });
      describe("when callback throws exception and autoFlushLogs is false", () => {
        it('should call "handle" method of exceptionHandler and rethrows and not flush logs', () => {
          const throwsCallback = () => {
            throw new Error("");
          };
          expect(() =>
            ExceptionsZone.run(throwsCallback, rethrow, false)
          ).toThrow();

          expect(handleSpy).toHaveBeenCalled();

          expect(LoggerFlushSpy).not.toHaveBeenCalled();
        });
      });

      describe("when callback throws exception and autoFlushLogs is true", () => {
        it('should call "handle" method of exceptionHandler and rethrows and flush logs', () => {
          const throwsCallback = () => {
            throw new Error("");
          };
          expect(() =>
            ExceptionsZone.run(throwsCallback, rethrow, true)
          ).toThrow();

          expect(handleSpy).toHaveBeenCalled();

          expect(LoggerFlushSpy).toHaveBeenCalled();
        });
      });
    });
  });

  describe("asyncRun", () => {
    let callback: ReturnType<typeof mock>;
    beforeEach(() => {
      callback = mock(() => {});
    });
    it("should call callback", async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await ExceptionsZone.asyncRun(callback as any, rethrow, false);
      expect(callback).toHaveBeenCalled();
    });
    describe("when callback throws exception", () => {
      const exceptionHandler = {
        handle: () => {},
      };
      let handleSpy: ReturnType<typeof spyOn>;
      let LoggerFlushSpy: ReturnType<typeof spyOn>;
      beforeAll(() => {
        (ExceptionsZone as any).exceptionHandler = exceptionHandler;
        handleSpy = spyOn(exceptionHandler, "handle");
        LoggerFlushSpy = spyOn(Logger, "flush");
      });
      afterAll(() => {
        LoggerFlushSpy.mockRestore();
      });
      describe("when callback throws exception and autoFlushLogs is false", () => {
        it('should call "handle" method of exceptionHandler and rethrows error and not flush logs', async () => {
          const throwsCallback = () => {
            throw new Error("");
          };
          await expect(ExceptionsZone.asyncRun(throwsCallback, rethrow, false)).rejects.toThrow();

          expect(handleSpy).toHaveBeenCalled();

          expect(LoggerFlushSpy).not.toHaveBeenCalled();
        });
      });
      describe("when callback throws exception and autoFlushLogs is true", () => {
        it('should call "handle" method of exceptionHandler and rethrows error and flush logs', async () => {
          const throwsCallback = () => {
            throw new Error("");
          };
          await expect(ExceptionsZone.asyncRun(throwsCallback, rethrow, true)).rejects.toThrow();

          expect(handleSpy).toHaveBeenCalled();

          expect(LoggerFlushSpy).toHaveBeenCalled();
        });
      });
    });
  });
});