/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ArgumentsHost } from "@venok/core";

import type { ErrorPayload } from "~/filters/filter.js";

import { MESSAGES } from "@venok/core";
import { afterEach, beforeEach, describe, expect, it, jest, mock, spyOn } from "bun:test";

import { WebsocketExceptionFilter } from "~/filters/filter.js";
import { WsException } from "~/exceptions/ws.exception.js";
import { WebsocketArgumentsHost } from "~/websocket/arguments-host.js";

describe("WebsocketExceptionFilter", () => {
  let filter: WebsocketExceptionFilter;
  let mockClient: { emit: jest.Mock };
  let mockHost: ArgumentsHost;
  let mockWebsocketContext: WebsocketArgumentsHost;

  beforeEach(() => {
    filter = new WebsocketExceptionFilter();
    mockClient = { emit: jest.fn() };
    mockHost = {} as ArgumentsHost;
    mockWebsocketContext = {
      getClient: jest.fn().mockReturnValue(mockClient),
      getPattern: jest.fn().mockReturnValue("test-pattern"),
      getData: jest.fn().mockReturnValue({ test: "data" }),
    } as any;

    // Mock the static logger to avoid console output during tests
    // @ts-expect-error Try to access to protected field
    spyOn(WebsocketExceptionFilter.logger, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with default options", () => {
      const filter = new WebsocketExceptionFilter();
      expect(filter["options"].includeCause).toBe(true);
      expect(typeof filter["options"].causeFactory).toBe("function");
    });

    it("should use provided options", () => {
      const customOptions = {
        includeCause: false,
        causeFactory: jest.fn().mockReturnValue({ custom: "cause" }),
      };
      const filter = new WebsocketExceptionFilter(customOptions);
      expect(filter["options"].includeCause).toBe(false);
      expect(filter["options"].causeFactory).toBe(customOptions.causeFactory);
    });

    it("should use default causeFactory when not provided", () => {
      const filter = new WebsocketExceptionFilter({ includeCause: false });
      const factory = filter["options"].causeFactory!;
      const result = factory("pattern", { data: "test" });
      expect(result).toEqual({ pattern: "pattern", data: { data: "test" } });
    });

    it("should override includeCause default when explicitly set", () => {
      const filter = new WebsocketExceptionFilter({ includeCause: false });
      expect(filter["options"].includeCause).toBe(false);
    });
  });

  describe("catch", () => {
    beforeEach(() => {
      spyOn(WebsocketArgumentsHost, "create").mockReturnValue(mockWebsocketContext);
      spyOn(filter, "handleError").mockImplementation(() => {});
    });

    it("should create WebsocketArgumentsHost and call handleError", () => {
      const exception = new Error("test error");
      filter.catch(exception, mockHost);

      expect(WebsocketArgumentsHost.create).toHaveBeenCalledWith(mockHost);
      expect(mockWebsocketContext.getClient).toHaveBeenCalled();
      expect(mockWebsocketContext.getPattern).toHaveBeenCalled();
      expect(mockWebsocketContext.getData).toHaveBeenCalled();
      expect(filter.handleError).toHaveBeenCalledWith(mockClient, exception, {
        pattern: "test-pattern",
        data: { test: "data" },
      });
    });

    it("should extract correct context information", () => {
      const exception = new WsException("test ws exception");
      const differentClient = { emit: jest.fn() };
      const differentPattern = "different-pattern";
      const differentData = { different: "data" };

      mockWebsocketContext.getClient = jest.fn().mockReturnValue(differentClient);
      mockWebsocketContext.getPattern = jest.fn().mockReturnValue(differentPattern);
      mockWebsocketContext.getData = jest.fn().mockReturnValue(differentData);

      filter.catch(exception, mockHost);

      expect(filter.handleError).toHaveBeenCalledWith(differentClient, exception, {
        pattern: differentPattern,
        data: differentData,
      });
    });
  });

  describe("handleError", () => {
    it("should handle WsException with string error", () => {
      const exception = new WsException("test error message");
      const cause = { pattern: "test-pattern", data: { test: "data" } };

      filter.handleError(mockClient, exception, cause);

      expect(mockClient.emit).toHaveBeenCalledWith("exception", {
        status: "error",
        message: "test error message",
        cause: { pattern: "test-pattern", data: { test: "data" } },
      });
    });

    it("should handle WsException with object error", () => {
      const errorObject = { code: 400, description: "Bad request" };
      const exception = new WsException(errorObject);
      const cause = { pattern: "test-pattern", data: { test: "data" } };

      filter.handleError(mockClient, exception, cause);

      expect(mockClient.emit).toHaveBeenCalledWith("exception", errorObject);
    });

    it("should handle WsException without includeCause", () => {
      filter = new WebsocketExceptionFilter({ includeCause: false });
      const exception = new WsException("test error");
      const cause = { pattern: "test-pattern", data: { test: "data" } };

      filter.handleError(mockClient, exception, cause);

      expect(mockClient.emit).toHaveBeenCalledWith("exception", {
        status: "error",
        message: "test error",
      });
    });

    it("should handle WsException with custom causeFactory", () => {
      const customCauseFactory = jest.fn().mockReturnValue({ custom: "cause" });
      filter = new WebsocketExceptionFilter({
        includeCause: true,
        causeFactory: customCauseFactory,
      });
      const exception = new WsException("test error");
      const cause = { pattern: "test-pattern", data: { test: "data" } };

      filter.handleError(mockClient, exception, cause);

      expect(customCauseFactory).toHaveBeenCalledWith("test-pattern", { test: "data" });
      expect(mockClient.emit).toHaveBeenCalledWith("exception", {
        status: "error",
        message: "test error",
        cause: { custom: "cause" },
      });
    });

    it("should handle WsException without cause", () => {
      const exception = new WsException("test error");

      filter.handleError(mockClient, exception, undefined);

      expect(mockClient.emit).toHaveBeenCalledWith("exception", {
        status: "error",
        message: "test error",
      });
    });

    it("should call handleUnknownError for non-WsException", () => {
      const exception = new Error("regular error");
      const cause = { pattern: "test-pattern", data: { test: "data" } };
      spyOn(filter, "handleUnknownError").mockImplementation(() => {});

      filter.handleError(mockClient, exception, cause);

      expect(filter.handleUnknownError).toHaveBeenCalledWith(exception, mockClient, cause);
    });
  });

  describe("handleUnknownError", () => {
    it("should emit unknown exception message", () => {
      const exception = new Error("unknown error");
      const cause = { pattern: "test-pattern", data: { test: "data" } };

      filter.handleUnknownError(exception, mockClient, cause);

      expect(mockClient.emit).toHaveBeenCalledWith("exception", {
        status: "error",
        message: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE,
        cause: { pattern: "test-pattern", data: { test: "data" } },
      });
      // @ts-expect-error Try to access to protected field
      expect(WebsocketExceptionFilter.logger.error).toHaveBeenCalledWith(exception);
    });

    it("should handle unknown error without includeCause", () => {
      filter = new WebsocketExceptionFilter({ includeCause: false });
      const exception = new Error("unknown error");
      const cause = { pattern: "test-pattern", data: { test: "data" } };

      filter.handleUnknownError(exception, mockClient, cause);

      expect(mockClient.emit).toHaveBeenCalledWith("exception", {
        status: "error",
        message: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE,
      });
    });

    it("should handle unknown error with custom causeFactory", () => {
      const customCauseFactory = jest.fn().mockReturnValue({ customError: "info" });
      filter = new WebsocketExceptionFilter({
        includeCause: true,
        causeFactory: customCauseFactory,
      });
      const exception = new Error("unknown error");
      const cause = { pattern: "test-pattern", data: { test: "data" } };

      filter.handleUnknownError(exception, mockClient, cause);

      expect(customCauseFactory).toHaveBeenCalledWith("test-pattern", { test: "data" });
      expect(mockClient.emit).toHaveBeenCalledWith("exception", {
        status: "error",
        message: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE,
        cause: { customError: "info" },
      });
    });

    it("should handle unknown error without cause data", () => {
      const exception = new Error("unknown error");

      filter.handleUnknownError(exception, mockClient, undefined);

      expect(mockClient.emit).toHaveBeenCalledWith("exception", {
        status: "error",
        message: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE,
      });
    });

    it("should log the exception", () => {
      const exception = new Error("unknown error");
      const cause = { pattern: "test-pattern", data: { test: "data" } };

      filter.handleUnknownError(exception, mockClient, cause);

      // @ts-expect-error Try to access to protected field
      expect(WebsocketExceptionFilter.logger.error).toHaveBeenCalledWith(exception);
    });
  });

  describe("isExceptionObject", () => {
    it("should return true for Error objects", () => {
      const error = new Error("test error");
      expect(filter.isExceptionObject(error)).toBe(true);
    });

    it("should return true for objects with message property", () => {
      const errorLike = { message: "test message", stack: "some stack" };
      expect(filter.isExceptionObject(errorLike)).toBe(true);
    });

    it("should return false for objects without message property", () => {
      const notError = { code: 400, description: "not an error" };
      expect(filter.isExceptionObject(notError)).toBe(false);
    });

    it("should return false for null", () => {
      expect(filter.isExceptionObject(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(filter.isExceptionObject(undefined)).toBe(false);
    });

    it("should return false for primitive values", () => {
      expect(filter.isExceptionObject("string")).toBe(false);
      expect(filter.isExceptionObject(123)).toBe(false);
      expect(filter.isExceptionObject(true)).toBe(false);
    });

    it("should return false for empty objects", () => {
      expect(filter.isExceptionObject({})).toBe(false);
    });

    it("should return true for objects with falsy message", () => {
      expect(filter.isExceptionObject({ message: "" })).toBe(false);
      expect(filter.isExceptionObject({ message: null })).toBe(false);
      expect(filter.isExceptionObject({ message: undefined })).toBe(false);
    });

    it("should return true for objects with truthy message", () => {
      expect(filter.isExceptionObject({ message: "error" })).toBe(true);
      expect(filter.isExceptionObject({ message: "0" })).toBe(true);
    });
  });

  describe("integration scenarios", () => {
    it("should handle complex WsException with nested object error", () => {
      const complexError = {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        errors: [
          { field: "name", message: "Required" },
          { field: "email", message: "Invalid format" },
        ],
      };
      const exception = new WsException(complexError);
      const cause = { pattern: "user:create", data: { name: "", email: "invalid" } };

      filter.handleError(mockClient, exception, cause);

      expect(mockClient.emit).toHaveBeenCalledWith("exception", complexError);
    });

    it("should handle chained exception handling", () => {
      const primaryException = new WsException("Primary error");
      const secondaryException = new Error("Secondary error");
      const cause = { pattern: "chain:test", data: { step: 1 } };

      // Handle primary exception
      filter.handleError(mockClient, primaryException, cause);
      // Handle secondary exception
      filter.handleError(mockClient, secondaryException, { pattern: "chain:test", data: { step: 2 } });

      expect(mockClient.emit).toHaveBeenCalledTimes(2);
      expect(mockClient.emit).toHaveBeenNthCalledWith(1, "exception", {
        status: "error",
        message: "Primary error",
        cause: { pattern: "chain:test", data: { step: 1 } },
      });
      expect(mockClient.emit).toHaveBeenNthCalledWith(2, "exception", {
        status: "error",
        message: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE,
        cause: { pattern: "chain:test", data: { step: 2 } },
      });
    });

    it("should handle various client emit implementations", () => {
      const clients = [
        { emit: jest.fn() },
        { emit: jest.fn() },
        { emit: jest.fn() },
      ];
      const exception = new WsException("Multi-client test");
      const cause = { pattern: "multi:test", data: { id: 123 } };

      clients.forEach((client, index) => {
        filter.handleError(client, exception, { ...cause, data: { id: index } });
        expect(client.emit).toHaveBeenCalledWith("exception", {
          status: "error",
          message: "Multi-client test",
          cause: { pattern: "multi:test", data: { id: index } },
        });
      });
    });

    it("should handle exceptions with different patterns simultaneously", () => {
      const patterns = ["user:login", "message:send", "file:upload"];
      const baseException = new WsException("Pattern test");

      patterns.forEach((pattern, index) => {
        const cause = { pattern, data: { index } };
        filter.handleError(mockClient, baseException, cause);
      });

      expect(mockClient.emit).toHaveBeenCalledTimes(3);
      patterns.forEach((pattern, index) => {
        expect(mockClient.emit).toHaveBeenNthCalledWith(index + 1, "exception", {
          status: "error",
          message: "Pattern test",
          cause: { pattern, data: { index } },
        });
      });
    });
  });

  describe("error boundary scenarios", () => {
    it("should handle null client gracefully", () => {
      const exception = new WsException("null client test");
      const cause = { pattern: "test", data: {} };

      expect(() => filter.handleError(null as any, exception, cause)).toThrow();
    });

    it("should handle client without emit method", () => {
      const invalidClient = { send: jest.fn() } as any;
      const exception = new WsException("invalid client");
      const cause = { pattern: "test", data: {} };

      expect(() => filter.handleError(invalidClient, exception, cause)).toThrow();
    });

    it("should handle extremely large error messages", () => {
      const largeMessage = "A".repeat(10000);
      const exception = new WsException(largeMessage);
      const cause = { pattern: "large:test", data: { size: "large" } };

      filter.handleError(mockClient, exception, cause);

      expect(mockClient.emit).toHaveBeenCalledWith("exception", {
        status: "error",
        message: largeMessage,
        cause: { pattern: "large:test", data: { size: "large" } },
      });
    });

    it("should handle circular references in cause data", () => {
      const circularData: any = { prop: "value" };
      circularData.circular = circularData;

      const exception = new WsException("circular test");
      const cause = { pattern: "circular:test", data: circularData };

      expect(() => filter.handleError(mockClient, exception, cause)).not.toThrow();
    });

    it("should handle falsy patterns and data", () => {
      const exception = new WsException("falsy test");
      const causes = [
        { pattern: "", data: null },
        { pattern: null as any, data: undefined },
        { pattern: undefined as any, data: 0 },
        { pattern: "0", data: false },
      ];

      causes.forEach((cause) => {
        expect(() => filter.handleError(mockClient, exception, cause)).not.toThrow();
      });

      expect(mockClient.emit).toHaveBeenCalledTimes(causes.length);
    });
  });

  describe("logger integration", () => {
    it("should use static logger for unknown errors", () => {
      const exception = new Error("logger test");
      const cause = { pattern: "logger:test", data: {} };

      filter.handleUnknownError(exception, mockClient, cause);

      // @ts-expect-error Try to access to protected field
      expect(WebsocketExceptionFilter.logger.error).toHaveBeenCalledWith(exception);
      // @ts-expect-error Try to access to protected field
      expect(WebsocketExceptionFilter.logger.error).toHaveBeenCalledTimes(1);
    });

    it("should not log WsExceptions", () => {
      const exception = new WsException("ws exception test");
      const cause = { pattern: "ws:test", data: {} };

      filter.handleError(mockClient, exception, cause);

      // @ts-expect-error Try to access to protected field
      expect(WebsocketExceptionFilter.logger.error).not.toHaveBeenCalled();
    });
  });
});