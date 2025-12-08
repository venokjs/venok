 
import type { ArgumentsHost } from "@venok/core";

import type { AbstractHttpAdapter } from "~/http/adapter.js";

import { ApplicationContext, MESSAGES, VenokContainer } from "@venok/core";
import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

import { HttpExceptionFilter } from "~/filters/filter.js";
import { HttpException } from "~/exceptions/http.exception.js";
import { HttpStatus } from "~/enums/status.enum.js";
import { HttpConfig } from "~/http/config.js";

describe("HttpExceptionFilter", () => {
  let filter: HttpExceptionFilter;
  let mockContainer: VenokContainer;
  let mockHttpConfig: HttpConfig;
  let mockAdapter: AbstractHttpAdapter;
  let mockHost: ArgumentsHost;
  let mockContext: any[];
  let mockApplicationContext: ApplicationContext;

  beforeEach(() => {
    // Create mocks
    mockContext = [{ request: {}, response: {} }];
    
    mockHost = {
      getArgByIndex: mock(() => mockContext),
    } as any;

    mockAdapter = {
      setResponseReply: mock(() => {}),
    } as any;

    mockHttpConfig = {
      getHttpAdapterRef: mock(() => mockAdapter),
    } as any;

    mockApplicationContext = {
      get: mock(() => mockHttpConfig),
    } as any;

    mockContainer = {
      applicationConfig: {},
      getModules: mock(() => new Map()),
    } as any;

    // Mock ApplicationContext constructor
    // @ts-expect-error Mismatch types
    spyOn(ApplicationContext, "constructor").mockImplementation(() => {
      return mockApplicationContext;
    });

    // Create filter instance
    filter = new HttpExceptionFilter(mockContainer);
    
    // Manually set the mocked context
    (filter as any).context = mockApplicationContext;
  });

  describe("constructor", () => {
    it("should create an instance with container", () => {
      expect(filter).toBeInstanceOf(HttpExceptionFilter);
      expect(filter).toBeDefined();
    });

    it("should create ApplicationContext with container", () => {
      const newFilter = new HttpExceptionFilter(mockContainer);
      expect(newFilter).toBeInstanceOf(HttpExceptionFilter);
    });
  });

  describe("catch", () => {
    it("should handle HttpException with string info", () => {
      const exception = new HttpException("Test error", HttpStatus.BAD_REQUEST);
      
      filter.catch(exception, mockHost);

      expect(mockApplicationContext.get).toHaveBeenCalledWith(HttpConfig);
      expect(mockHttpConfig.getHttpAdapterRef).toHaveBeenCalled();
      expect(mockHost.getArgByIndex).toHaveBeenCalledWith(0);
      expect(mockAdapter.setResponseReply).toHaveBeenCalledWith(
        mockContext,
        { statusCode: HttpStatus.BAD_REQUEST, error: "Test error" },
        HttpStatus.BAD_REQUEST
      );
    });

    it("should handle HttpException with object info", () => {
      const info = { message: "Custom error", data: "test" };
      const exception = new HttpException(info, HttpStatus.NOT_FOUND);
      
      filter.catch(exception, mockHost);

      expect(mockAdapter.setResponseReply).toHaveBeenCalledWith(
        mockContext,
        info,
        HttpStatus.NOT_FOUND
      );
    });

    it("should handle HttpException with complex object info", () => {
      const info = { 
        error: "Validation failed",
        details: ["Field required", "Invalid format"],
        timestamp: "2023-01-01",
      };
      const exception = new HttpException(info, HttpStatus.UNPROCESSABLE_ENTITY);
      
      filter.catch(exception, mockHost);

      expect(mockAdapter.setResponseReply).toHaveBeenCalledWith(
        mockContext,
        info,
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    });

    it("should call handleUnknownError for non-HttpException", () => {
      const error = new Error("Generic error");
      const handleUnknownErrorSpy = spyOn(filter, "handleUnknownError");
      
      filter.catch(error, mockHost);

      expect(handleUnknownErrorSpy).toHaveBeenCalledWith(error, mockHost, mockAdapter);
    });

    it("should call handleUnknownError for plain objects", () => {
      const error = { message: "Plain object error" };
      const handleUnknownErrorSpy = spyOn(filter, "handleUnknownError");
      
      filter.catch(error, mockHost);

      expect(handleUnknownErrorSpy).toHaveBeenCalledWith(error, mockHost, mockAdapter);
    });

    it("should call handleUnknownError for null", () => {
      const handleUnknownErrorSpy = spyOn(filter, "handleUnknownError");
      
      filter.catch(null, mockHost);

      expect(handleUnknownErrorSpy).toHaveBeenCalledWith(null, mockHost, mockAdapter);
    });
  });

  describe("handleUnknownError", () => {
    let loggerErrorSpy: any;

    beforeEach(() => {
      loggerErrorSpy = spyOn((HttpExceptionFilter as any).logger, "error").mockImplementation(() => {});
    });

    it("should handle http-errors library errors", () => {
      const httpError = {
        statusCode: 404,
        message: "Not Found",
      };
      
      filter.handleUnknownError(httpError, mockHost, mockAdapter);

      expect(mockAdapter.setResponseReply).toHaveBeenCalledWith(
        mockContext,
        { statusCode: 404, error: "Not Found" },
        404
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith("Not Found", undefined);
    });

    it("should handle Error objects", () => {
      const error = new Error("Standard error");
      error.stack = "Error stack trace";
      
      filter.handleUnknownError(error, mockHost, mockAdapter);

      expect(mockAdapter.setResponseReply).toHaveBeenCalledWith(
        mockContext,
        { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, error: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith("Standard error", "Error stack trace");
    });

    it("should handle TypeError objects", () => {
      const error = new TypeError("Type error");
      
      filter.handleUnknownError(error, mockHost, mockAdapter);

      expect(mockAdapter.setResponseReply).toHaveBeenCalledWith(
        mockContext,
        { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, error: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith("Type error", error.stack);
    });

    it("should handle non-Error objects", () => {
      const plainError = "String error";
      
      filter.handleUnknownError(plainError, mockHost, mockAdapter);

      expect(mockAdapter.setResponseReply).toHaveBeenCalledWith(
        mockContext,
        { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, error: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(plainError);
    });

    it("should handle null errors", () => {
      filter.handleUnknownError(null, mockHost, mockAdapter);

      expect(mockAdapter.setResponseReply).toHaveBeenCalledWith(
        mockContext,
        { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, error: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(null);
    });

    it("should handle undefined errors", () => {
      filter.handleUnknownError(undefined, mockHost, mockAdapter);

      expect(mockAdapter.setResponseReply).toHaveBeenCalledWith(
        mockContext,
        { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, error: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(undefined);
    });

    it("should handle http-errors with custom status codes", () => {
      const customHttpError = {
        statusCode: 418,
        message: "I'm a teapot",
      };
      
      filter.handleUnknownError(customHttpError, mockHost, mockAdapter);

      expect(mockAdapter.setResponseReply).toHaveBeenCalledWith(
        mockContext,
        { statusCode: 418, error: "I'm a teapot" },
        418
      );
    });
  });

  describe("isExceptionObject", () => {
    it("should return true for Error objects", () => {
      const error = new Error("Test error");
      expect(filter.isExceptionObject(error)).toBe(true);
    });

    it("should return true for TypeError objects", () => {
      const error = new TypeError("Type error");
      expect(filter.isExceptionObject(error)).toBe(true);
    });

    it("should return true for custom Error classes", () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = "CustomError";
        }
      }
      
      const error = new CustomError("Custom error");
      expect(filter.isExceptionObject(error)).toBe(true);
    });

    it("should return true for objects with message property", () => {
      const errorObj = { message: "Object with message" };
      expect(filter.isExceptionObject(errorObj)).toBe(true);
    });

    it("should return false for objects without message", () => {
      const obj = { data: "no message" };
      expect(filter.isExceptionObject(obj)).toBe(false);
    });

    it("should return false for primitive types", () => {
      expect(filter.isExceptionObject("string")).toBe(false);
      expect(filter.isExceptionObject(123)).toBe(false);
      expect(filter.isExceptionObject(true)).toBe(false);
    });

    it("should return false for null and undefined", () => {
      expect(filter.isExceptionObject(null)).toBe(false);
      expect(filter.isExceptionObject(undefined)).toBe(false);
    });

    it("should return false for empty objects", () => {
      expect(filter.isExceptionObject({})).toBe(false);
    });

    it("should return false for arrays", () => {
      expect(filter.isExceptionObject([])).toBe(false);
      expect(filter.isExceptionObject(["error"])).toBe(false);
    });

    it("should return false for objects with falsy message", () => {
      expect(filter.isExceptionObject({ message: "" })).toBe(false);
      expect(filter.isExceptionObject({ message: null })).toBe(false);
      expect(filter.isExceptionObject({ message: undefined })).toBe(false);
      expect(filter.isExceptionObject({ message: 0 })).toBe(false);
      expect(filter.isExceptionObject({ message: false })).toBe(false);
    });
  });

  describe("isHttpError", () => {
    it("should return truthy for objects with statusCode and message", () => {
      const httpError = { statusCode: 404, message: "Not Found" };
      expect(filter.isHttpError(httpError)).toBeTruthy();
    });

    it("should return truthy for http-errors library errors", () => {
      const httpError = { 
        statusCode: 400, 
        message: "Bad Request",
        name: "BadRequest",
        status: 400,
      };
      expect(filter.isHttpError(httpError)).toBeTruthy();
    });

    it("should return falsy for objects missing statusCode", () => {
      const obj = { message: "Has message but no statusCode" };
      expect(filter.isHttpError(obj)).toBeFalsy();
    });

    it("should return falsy for objects missing message", () => {
      const obj = { statusCode: 500 };
      expect(filter.isHttpError(obj)).toBeFalsy();
    });

    it("should return falsy for objects with falsy statusCode", () => {
      expect(filter.isHttpError({ statusCode: 0, message: "Zero status" })).toBeFalsy();
      expect(filter.isHttpError({ statusCode: null, message: "Null status" })).toBeFalsy();
      expect(filter.isHttpError({ statusCode: undefined, message: "Undefined status" })).toBeFalsy();
      expect(filter.isHttpError({ statusCode: "", message: "Empty status" })).toBeFalsy();
    });

    it("should return falsy for objects with falsy message", () => {
      expect(filter.isHttpError({ statusCode: 400, message: "" })).toBeFalsy();
      expect(filter.isHttpError({ statusCode: 400, message: null })).toBeFalsy();
      expect(filter.isHttpError({ statusCode: 400, message: undefined })).toBeFalsy();
      expect(filter.isHttpError({ statusCode: 400, message: 0 })).toBeFalsy();
    });

    it("should return falsy for Error objects", () => {
      const error = new Error("Standard error");
      expect(filter.isHttpError(error)).toBeFalsy();
    });

    it("should return falsy for primitive types", () => {
      expect(filter.isHttpError("string")).toBeFalsy();
      expect(filter.isHttpError(123)).toBeFalsy();
      expect(filter.isHttpError(true)).toBeFalsy();
    });

    it("should return falsy for null and undefined", () => {
      expect(filter.isHttpError(null)).toBeFalsy();
      expect(filter.isHttpError(undefined)).toBeFalsy();
    });

    it("should return falsy for empty objects", () => {
      expect(filter.isHttpError({})).toBeFalsy();
    });

    it("should handle objects with numeric string statusCode", () => {
      const httpError = { statusCode: "404", message: "Not Found" };
      expect(filter.isHttpError(httpError)).toBeTruthy();
    });

    it("should handle objects with non-numeric statusCode", () => {
      const invalidError = { statusCode: "invalid", message: "Invalid status" };
      expect(filter.isHttpError(invalidError)).toBeTruthy(); // Still truthy
    });
  });

  describe("edge cases", () => {
    it("should handle HttpException with null info", () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const exception = new HttpException(null as any, HttpStatus.BAD_REQUEST);
      
      filter.catch(exception, mockHost);

      expect(mockAdapter.setResponseReply).toHaveBeenCalledWith(
        mockContext,
        { statusCode: HttpStatus.BAD_REQUEST, error: null },
        HttpStatus.BAD_REQUEST
      );
    });

    it("should handle HttpException with undefined info", () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const exception = new HttpException(undefined as any, HttpStatus.BAD_REQUEST);
      
      filter.catch(exception, mockHost);

      expect(mockAdapter.setResponseReply).toHaveBeenCalledWith(
        mockContext,
        { statusCode: HttpStatus.BAD_REQUEST, error: undefined },
        HttpStatus.BAD_REQUEST
      );
    });

    it("should handle HttpException with array info", () => {
      const info = ["Error 1", "Error 2"];
      const exception = new HttpException(info, HttpStatus.UNPROCESSABLE_ENTITY);
      
      filter.catch(exception, mockHost);

      expect(mockAdapter.setResponseReply).toHaveBeenCalledWith(
        mockContext,
        info, // Array is treated as object, so passed as-is
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    });

    it("should handle HttpException with number info", () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const exception = new HttpException(42 as any, HttpStatus.BAD_REQUEST);
      
      filter.catch(exception, mockHost);

      expect(mockAdapter.setResponseReply).toHaveBeenCalledWith(
        mockContext,
        { statusCode: HttpStatus.BAD_REQUEST, error: 42 },
        HttpStatus.BAD_REQUEST
      );
    });

    it("should handle circular reference in exception info", () => {
      const info: any = { data: "test" };
      info.self = info;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const exception = new HttpException(info, HttpStatus.BAD_REQUEST);
      
      filter.catch(exception, mockHost);

      expect(mockAdapter.setResponseReply).toHaveBeenCalledWith(
        mockContext,
        info,
        HttpStatus.BAD_REQUEST
      );
    });
  });

  describe("integration scenarios", () => {
    it("should handle validation errors scenario", () => {
      const validationInfo = {
        message: "Validation failed",
        errors: [
          { field: "email", message: "Invalid email format" },
          { field: "password", message: "Password too short" },
        ],
      };
      const exception = new HttpException(validationInfo, HttpStatus.BAD_REQUEST);
      
      filter.catch(exception, mockHost);

      expect(mockAdapter.setResponseReply).toHaveBeenCalledWith(
        mockContext,
        validationInfo,
        HttpStatus.BAD_REQUEST
      );
    });

    it("should handle database error scenario", () => {
      const dbError = {
        statusCode: 503,
        message: "Database connection failed",
        name: "DatabaseError",
        errno: -111,
      };
      
      filter.handleUnknownError(dbError, mockHost, mockAdapter);

      expect(mockAdapter.setResponseReply).toHaveBeenCalledWith(
        mockContext,
        { statusCode: 503, error: "Database connection failed" },
        503
      );
    });

    it("should handle timeout scenario", () => {
      const timeoutError = new Error("Request timeout");
      timeoutError.name = "TimeoutError";
      
      filter.handleUnknownError(timeoutError, mockHost, mockAdapter);

      expect(mockAdapter.setResponseReply).toHaveBeenCalledWith(
        mockContext,
        { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, error: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    });

    it("should handle authentication error with cause", () => {
      const authError = new HttpException(
        "Authentication failed", 
        HttpStatus.UNAUTHORIZED,
        { cause: new Error("JWT expired") }
      );
      
      filter.catch(authError, mockHost);

      expect(mockAdapter.setResponseReply).toHaveBeenCalledWith(
        mockContext,
        { statusCode: HttpStatus.UNAUTHORIZED, error: "Authentication failed" },
        HttpStatus.UNAUTHORIZED
      );
    });
  });
});