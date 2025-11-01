import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import { ExceptionHandler } from "~/exceptions/zone/handler.js";
import { RuntimeException } from "~/errors/exceptions/runtime.exception.js";

describe("ExceptionHandler", () => {
  let instance: ExceptionHandler;
  beforeEach(() => {
    instance = new ExceptionHandler();
  });

  describe("constructor", () => {
    it("should initialize with static logger", () => {
      expect((ExceptionHandler as any).logger).toBeDefined();
      expect((ExceptionHandler as any).logger.constructor.name).toBe("Logger");
    });
  });

  describe("handle", () => {
    let logger: { error: Function };
    let errorSpy: any;
    beforeEach(() => {
      logger = {
        error: () => {},
      };
      (ExceptionHandler as any).logger = logger;
      errorSpy = spyOn(logger, "error");
    });
    it("should call the logger.error method with the thrown exception passed as an argument", () => {
      const exception = new RuntimeException("msg");
      instance.handle(exception);
      expect(errorSpy).toHaveBeenCalledWith(exception);
    });

    it("should call the logger.error method with a regular Error", () => {
      const error = new Error("regular error message");
      instance.handle(error);
      expect(errorSpy).toHaveBeenCalledWith(error);
    });

    it("should return the result from logger.error", () => {
      const exception = new RuntimeException("msg");
      const mockResult = "logged";
      errorSpy.mockReturnValue(mockResult);
      
      const result = instance.handle(exception);
      // @ts-expect-error Mismatch types
      expect(result).toBe(mockResult);
    });
  });
});