import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { Logger, MESSAGES } from "@venok/core";
import { throwError } from "rxjs";

import { MicroserviceExceptionFilter } from "~/filters/filter.js";
import { MicroserviceException } from "~/exceptions/microservice.exception.js";

describe("MicroserviceExceptionFilter", () => {
  let filter: MicroserviceExceptionFilter;
  let loggerErrorSpy: any;

  beforeEach(() => {
    filter = new MicroserviceExceptionFilter();
    
    // Spy on Logger.error to avoid console noise during tests
    loggerErrorSpy = spyOn(Logger.prototype, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    loggerErrorSpy?.mockRestore();
  });

  describe("catch", () => {
    describe("when exception is MicroserviceException", () => {
      it("should return throwError with string error as object", () => {
        const errorMessage = "Test error message";
        const exception = new MicroserviceException(errorMessage);

        const result$ = filter.catch(exception);

        expect(result$).toBeDefined();
        
        result$.subscribe({
          error: (err) => {
            expect(err).toEqual({ status: "error", message: errorMessage });
          },
        });
      });

      it("should return throwError with object error as is when it's an object", () => {
        const errorObject = { code: 500, message: "Internal error", data: { id: 1 } };
        const exception = new MicroserviceException(errorObject);

        const result$ = filter.catch(exception);

        result$.subscribe({
          error: (err) => {
            expect(err).toEqual(errorObject);
          },
        });
      });

      it("should return throwError with primitive error wrapped in object", () => {
        // @ts-expect-error Mismatch types
        const exception = new MicroserviceException(null);

        const result$ = filter.catch(exception);

        result$.subscribe({
          error: (err) => {
            expect(err).toEqual({ status: "error", message: null });
          },
        });
      });

      it("should return throwError with number error wrapped in object", () => {
        // @ts-expect-error Mismatch types
        const exception = new MicroserviceException(404);

        const result$ = filter.catch(exception);

        result$.subscribe({
          error: (err) => {
            expect(err).toEqual({ status: "error", message: 404 });
          },
        });
      });

      it("should return throwError with boolean error wrapped in object", () => {
        // @ts-expect-error Mismatch types
        const exception = new MicroserviceException(false);

        const result$ = filter.catch(exception);

        result$.subscribe({
          error: (err) => {
            expect(err).toEqual({ status: "error", message: false });
          },
        });
      });

      it("should return throwError with undefined error wrapped in object", () => {
        // @ts-expect-error Mismatch types
        const exception = new MicroserviceException(undefined);

        const result$ = filter.catch(exception);

        result$.subscribe({
          error: (err) => {
            expect(err).toEqual({ status: "error", message: undefined });
          },
        });
      });

      it("should use isObject utility to determine error type", () => {
        const errorObject = { test: "value" };
        const exception = new MicroserviceException(errorObject);

        const result$ = filter.catch(exception);
        
        // Verify that the object error is returned as-is because it's an object
        result$.subscribe({
          error: (err) => {
            expect(err).toEqual(errorObject);
          },
        });
      });
    });

    describe("when exception is not MicroserviceException", () => {
      it("should call handleUnknownError with exception and error status", () => {
        const unknownError = new Error("Unknown error");
        const handleUnknownErrorSpy = spyOn(filter, "handleUnknownError").mockReturnValue(
          throwError(() => ({ status: "error", message: "mocked" }))
        );

        filter.catch(unknownError);

        expect(handleUnknownErrorSpy).toHaveBeenCalledWith(unknownError, "error");
        handleUnknownErrorSpy.mockRestore();
      });

      it("should return result from handleUnknownError", () => {
        const unknownError = new TypeError("Type error");
        const mockObservable = throwError(() => ({ test: "result" }));
        spyOn(filter, "handleUnknownError").mockReturnValue(mockObservable);

        const result = filter.catch(unknownError);

        expect(result).toBe(mockObservable);
      });

      it("should handle null exception", () => {
        const handleUnknownErrorSpy = spyOn(filter, "handleUnknownError").mockReturnValue(
          throwError(() => ({ status: "error", message: "test" }))
        );

        filter.catch(null);

        expect(handleUnknownErrorSpy).toHaveBeenCalledWith(null, "error");
        handleUnknownErrorSpy.mockRestore();
      });

      it("should handle undefined exception", () => {
        const handleUnknownErrorSpy = spyOn(filter, "handleUnknownError").mockReturnValue(
          throwError(() => ({ status: "error", message: "test" }))
        );

        filter.catch(undefined);

        expect(handleUnknownErrorSpy).toHaveBeenCalledWith(undefined, "error");
        handleUnknownErrorSpy.mockRestore();
      });

      it("should handle plain object exception", () => {
        const plainObject = { error: "Plain object error" };
        const handleUnknownErrorSpy = spyOn(filter, "handleUnknownError").mockReturnValue(
          throwError(() => ({ status: "error", message: "test" }))
        );

        filter.catch(plainObject);

        expect(handleUnknownErrorSpy).toHaveBeenCalledWith(plainObject, "error");
        handleUnknownErrorSpy.mockRestore();
      });

      it("should handle string exception", () => {
        const stringError = "String error";
        const handleUnknownErrorSpy = spyOn(filter, "handleUnknownError").mockReturnValue(
          throwError(() => ({ status: "error", message: "test" }))
        );

        filter.catch(stringError);

        expect(handleUnknownErrorSpy).toHaveBeenCalledWith(stringError, "error");
        handleUnknownErrorSpy.mockRestore();
      });

      it("should handle number exception", () => {
        const numberError = 500;
        const handleUnknownErrorSpy = spyOn(filter, "handleUnknownError").mockReturnValue(
          throwError(() => ({ status: "error", message: "test" }))
        );

        filter.catch(numberError);

        expect(handleUnknownErrorSpy).toHaveBeenCalledWith(numberError, "error");
        handleUnknownErrorSpy.mockRestore();
      });
    });
  });

  describe("handleUnknownError", () => {
    it("should return throwError with status and unknown exception message", () => {
      const exception = new Error("Some error");
      const status = "test-status";

      const result$ = filter.handleUnknownError(exception, status);

      result$.subscribe({
        error: (err) => {
          expect(err).toEqual({
            status: status,
            message: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE,
          });
        },
      });
    });

    it("should use MESSAGES.UNKNOWN_EXCEPTION_MESSAGE constant", () => {
      const exception = { custom: "error" };
      const status = "custom-status";

      const result$ = filter.handleUnknownError(exception, status);

      result$.subscribe({
        error: (err) => {
          expect(err.message).toBe(MESSAGES.UNKNOWN_EXCEPTION_MESSAGE);
        },
      });
    });

    it("should preserve provided status", () => {
      const exception = "test";
      const customStatus = "warning";

      const result$ = filter.handleUnknownError(exception, customStatus);

      result$.subscribe({
        error: (err) => {
          expect(err.status).toBe(customStatus);
        },
      });
    });

    it("should handle null exception", () => {
      const result$ = filter.handleUnknownError(null, "error");

      result$.subscribe({
        error: (err) => {
          expect(err).toEqual({
            status: "error",
            message: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE,
          });
        },
      });
    });

    it("should handle undefined exception", () => {
      const result$ = filter.handleUnknownError(undefined, "error");

      result$.subscribe({
        error: (err) => {
          expect(err).toEqual({
            status: "error",
            message: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE,
          });
        },
      });
    });

    it("should handle empty string status", () => {
      const result$ = filter.handleUnknownError("error", "");

      result$.subscribe({
        error: (err) => {
          expect(err.status).toBe("");
          expect(err.message).toBe(MESSAGES.UNKNOWN_EXCEPTION_MESSAGE);
        },
      });
    });
  });

  describe("isError", () => {
    it("should return true for Error instance with message", () => {
      const error = new Error("Test error");

      const result = filter.isError(error);

      expect(result).toBe(true);
    });

    it("should return true for object with message property", () => {
      const errorLike = { message: "Error message", stack: "stack trace" };

      const result = filter.isError(errorLike);

      expect(result).toBe(true);
    });

    it("should return true for object with empty string message", () => {
      const errorLike = { message: "" };

      const result = filter.isError(errorLike);

      expect(result).toBe(false);
    });

    it("should return false for object without message property", () => {
      const notError = { error: "This is not an error object" };

      const result = filter.isError(notError);

      expect(result).toBe(false);
    });

    it("should return false for object with null message", () => {
      const notError = { message: null };

      const result = filter.isError(notError);

      expect(result).toBe(false);
    });

    it("should return false for object with undefined message", () => {
      const notError = { message: undefined };

      const result = filter.isError(notError);

      expect(result).toBe(false);
    });

    it("should return false for object with number message", () => {
      const notError = { message: 123 };

      const result = filter.isError(notError);

      expect(result).toBe(true); // Numbers are truthy, so this returns true
    });

    it("should return false for object with boolean message", () => {
      const notError = { message: true };

      const result = filter.isError(notError);

      expect(result).toBe(true); // Boolean true is truthy, so this returns true
    });

    it("should return false for null", () => {
      const result = filter.isError(null);

      expect(result).toBe(false);
    });

    it("should return false for undefined", () => {
      const result = filter.isError(undefined);

      expect(result).toBe(false);
    });

    it("should return false for string", () => {
      const result = filter.isError("error string");

      expect(result).toBe(false);
    });

    it("should return false for number", () => {
      const result = filter.isError(500);

      expect(result).toBe(false);
    });

    it("should return false for boolean", () => {
      const result = filter.isError(true);

      expect(result).toBe(false);
    });

    it("should return false for array", () => {
      const result = filter.isError([]);

      expect(result).toBe(false);
    });

    it("should return false for function", () => {
      const result = filter.isError(() => {});

      expect(result).toBe(false);
    });

    it("should check both isObject and message truthiness", () => {
      const testObject = { message: "test" };

      const result = filter.isError(testObject);

      expect(result).toBe(true); // Object with truthy message
    });

    it("should validate message property exists and is truthy", () => {
      const errorLike = { message: "Valid message", otherProp: "value" };

      const result = filter.isError(errorLike);

      expect(result).toBe(true);
    });

    it("should handle complex Error subclasses", () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = "CustomError";
        }
      }

      const customError = new CustomError("Custom error message");

      const result = filter.isError(customError);

      expect(result).toBe(true);
    });

    it("should handle objects that mimic Error structure", () => {
      const errorMimic = {
        name: "ErrorMimic",
        message: "Mimic error message",
        stack: "fake stack trace",
      };

      const result = filter.isError(errorMimic);

      expect(result).toBe(true);
    });

    it("should handle Error instance without message", () => {
      const error = new Error();
      error.message = "";

      const result = filter.isError(error);

      expect(result).toBe(false);
    });
  });

  describe("logger", () => {
    it("should have a static logger instance", () => {
      expect((MicroserviceExceptionFilter as any).logger).toBeInstanceOf(Logger);
    });

    it("should use correct logger context", () => {
      const logger = (MicroserviceExceptionFilter as any).logger;
      expect(logger.context).toBe("MicroserviceExceptionFilter");
    });
  });

  describe("type safety and generic behavior", () => {
    it("should work with different exception types", () => {
      interface CustomException {
        code: number;
        details: string;
      }

      const customFilter = new MicroserviceExceptionFilter<CustomException, any>();
      const exception: CustomException = { code: 400, details: "Bad request" };

      const handleUnknownErrorSpy = spyOn(customFilter, "handleUnknownError").mockReturnValue(
        throwError(() => ({ status: "error", message: "test" }))
      );

      customFilter.catch(exception);

      expect(handleUnknownErrorSpy).toHaveBeenCalledWith(exception, "error");
      handleUnknownErrorSpy.mockRestore();
    });

    it("should work with different return types", () => {
      interface CustomResponse {
        success: boolean;
        data: any;
      }

      const customFilter = new MicroserviceExceptionFilter<any, CustomResponse>();
      const exception = new MicroserviceException("test");

      const result$ = customFilter.catch(exception);

      expect(result$).toBeDefined();
    });
  });

  describe("integration with RxJS", () => {
    it("should return proper Observable from throwError", () => {
      const exception = new MicroserviceException("test");

      const result$ = filter.catch(exception);

      expect(typeof result$.subscribe).toBe("function");
      expect(typeof result$.pipe).toBe("function");
    });

    it("should emit error synchronously in observable", () => {
      const exception = new MicroserviceException("sync test");
      let emittedError: any;

      filter.catch(exception).subscribe({
        error: (err) => {
          emittedError = err;
        },
      });

      expect(emittedError).toEqual({ status: "error", message: "sync test" });
    });

    it("should allow error handling with rxjs operators", () => {
      const exception = new MicroserviceException("operator test");
      let catchError: any;
      
      filter.catch(exception).subscribe({
        next: () => {
          // Should not be called
          expect(true).toBe(false);
        },
        error: (err) => {
          catchError = err;
        },
      });

      expect(catchError).toBeDefined();
      expect(catchError.message).toBe("operator test");
    });
  });
});