/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, expect, it, mock, spyOn } from "bun:test";
import { HttpException } from "~/exceptions/http.exception.js";
import { HttpStatus } from "~/enums/status.enum.js";

describe("HttpException", () => {
  describe("constructor", () => {
    it("should create an instance with string message", () => {
      const exception = new HttpException("Test message", HttpStatus.BAD_REQUEST);
      
      expect(exception).toBeInstanceOf(Error);
      expect(exception).toBeInstanceOf(HttpException);
      expect(exception.message).toBe("Test message");
      expect(exception.getInfo()).toBe("Test message");
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.name).toBe("HttpException");
    });

    it("should create an instance with object info", () => {
      const info = { custom: "data", id: 123 };
      const exception = new HttpException(info, HttpStatus.INTERNAL_SERVER_ERROR);
      
      expect(exception.getInfo()).toEqual(info);
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it("should create an instance with object info containing message", () => {
      const info = { message: "Object message", data: "test" };
      const exception = new HttpException(info, HttpStatus.NOT_FOUND);
      
      expect(exception.message).toBe("Object message");
      expect(exception.getInfo()).toEqual(info);
    });

    it("should handle options with cause", () => {
      const cause = new Error("Root cause");
      const options = { cause };
      const exception = new HttpException("Test", HttpStatus.BAD_REQUEST, options);
      
      expect(exception.cause).toBe(cause);
    });

    it("should handle options without cause", () => {
      const options = { description: "Test description" };
      const exception = new HttpException("Test", HttpStatus.BAD_REQUEST, options);
      
      expect(exception.cause).toBeUndefined();
    });

    it("should set name from constructor", () => {
      const exception = new HttpException("Test", HttpStatus.BAD_REQUEST);
      
      expect(exception.name).toBe("HttpException");
    });
  });

  describe("initMessage", () => {
    it("should set message from string info", () => {
      const exception = new HttpException("String message", HttpStatus.BAD_REQUEST);
      
      expect(exception.message).toBe("String message");
    });

    it("should set message from object with message property", () => {
      const info = { message: "Object message", other: "data" };
      const exception = new HttpException(info, HttpStatus.BAD_REQUEST);
      
      expect(exception.message).toBe("Object message");
    });

    it("should generate message from constructor name when no message", () => {
      const info = { data: "test" };
      const exception = new HttpException(info, HttpStatus.BAD_REQUEST);
      
      expect(exception.message).toBe("Http Exception");
    });

    it("should handle empty object info", () => {
      const exception = new HttpException({}, HttpStatus.BAD_REQUEST);
      
      expect(exception.message).toBe("Http Exception");
    });
  });

  describe("initCause", () => {
    it("should set cause when provided in options", () => {
      const cause = new Error("Root cause");
      const exception = new HttpException("Test", HttpStatus.BAD_REQUEST, { cause });
      
      expect(exception.cause).toBe(cause);
    });

    it("should not set cause when not provided", () => {
      const exception = new HttpException("Test", HttpStatus.BAD_REQUEST);
      
      expect(exception.cause).toBeUndefined();
    });

    it("should not set cause when options is empty", () => {
      const exception = new HttpException("Test", HttpStatus.BAD_REQUEST, {});
      
      expect(exception.cause).toBeUndefined();
    });
  });

  describe("getInfo", () => {
    it("should return string info", () => {
      const info = "Test info";
      const exception = new HttpException(info, HttpStatus.BAD_REQUEST);
      
      expect(exception.getInfo()).toBe(info);
    });

    it("should return object info", () => {
      const info = { message: "test", data: 123 };
      const exception = new HttpException(info, HttpStatus.BAD_REQUEST);
      
      expect(exception.getInfo()).toEqual(info);
    });
  });

  describe("getResponse", () => {
    it("should return same as getInfo (deprecated method)", () => {
      const info = "Test response";
      const exception = new HttpException(info, HttpStatus.BAD_REQUEST);
      
      expect(exception.getResponse()).toBe(exception.getInfo());
      expect(exception.getResponse()).toBe(info);
    });
  });

  describe("getStatus", () => {
    it("should return the status code", () => {
      const exception = new HttpException("Test", HttpStatus.NOT_FOUND);
      
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
    });

    it("should return custom status code", () => {
      const customStatus = 429;
      const exception = new HttpException("Test", customStatus);
      
      expect(exception.getStatus()).toBe(customStatus);
    });
  });

  describe("createBody", () => {
    it("should create body with null/empty first argument", () => {
      const body1 = HttpException.createBody(null, "Bad Request", 400);
      const body2 = HttpException.createBody("", "Bad Request", 400);
      
      expect(body1).toEqual({
        error: "Bad Request",
        statusCode: 400
      });
      
      expect(body2).toEqual({
        error: "Bad Request", 
        statusCode: 400
      });
    });

    it("should create body with string message", () => {
      const body = HttpException.createBody("Test message", "Bad Request", 400);
      
      expect(body).toEqual({
        message: "Test message",
        error: "Bad Request",
        statusCode: 400
      });
    });

    it("should create body with array message", () => {
      const messages = ["Error 1", "Error 2"];
      const body = HttpException.createBody(messages, "Validation Error", 422);
      
      expect(body).toEqual({
        message: messages,
        error: "Validation Error",
        statusCode: 422
      });
    });

    it("should return custom object as is", () => {
      const customBody = { 
        custom: "data", 
        statusCode: 500, 
        timestamp: "2023-01-01" 
      };
      const body = HttpException.createBody(customBody);
      
      expect(body).toEqual(customBody);
      expect(body).toBe(customBody);
    });

    it("should handle complex object", () => {
      const customObject = {
        error: "Complex error",
        details: { field: "value", nested: { data: 123 } },
        statusCode: 400
      };
      const body = HttpException.createBody(customObject);
      
      expect(body).toEqual(customObject);
    });
  });

  describe("getDescriptionFrom", () => {
    it("should return string description", () => {
      const description = "Test description";
      const result = HttpException.getDescriptionFrom(description);
      
      expect(result).toBe(description);
    });

    it("should extract description from options object", () => {
      const options = { description: "Options description", cause: new Error() };
      const result = HttpException.getDescriptionFrom(options);
      
      expect(result).toBe("Options description");
    });

    it("should handle options without description", () => {
      const options = { cause: new Error("test") };
      const result = HttpException.getDescriptionFrom(options);
      
      expect(result).toBeUndefined();
    });
  });

  describe("getHttpExceptionOptionsFrom", () => {
    it("should return empty object for string input", () => {
      const result = HttpException.getHttpExceptionOptionsFrom("test description");
      
      expect(result).toEqual({});
    });

    it("should return options object as is", () => {
      const options = { description: "test", cause: new Error("test") };
      const result = HttpException.getHttpExceptionOptionsFrom(options);
      
      expect(result).toEqual(options);
      expect(result).toBe(options);
    });
  });

  describe("extractDescriptionAndOptionsFrom", () => {
    it("should extract description and empty options from string", () => {
      const result = HttpException.extractDescriptionAndOptionsFrom("String description");
      
      expect(result).toEqual({
        description: "String description",
        httpExceptionOptions: {}
      });
    });

    it("should extract description and options from object", () => {
      const options = { description: "Object description", cause: new Error("test") };
      const result = HttpException.extractDescriptionAndOptionsFrom(options);
      
      expect(result).toEqual({
        description: "Object description",
        httpExceptionOptions: options
      });
    });

    it("should use fallback description when options has no description", () => {
      const options = { cause: new Error("test") };
      const result = HttpException.extractDescriptionAndOptionsFrom(options, "Fallback");
      
      expect(result).toEqual({
        description: "Fallback",
        httpExceptionOptions: options
      });
    });

    it("should use default fallback when not provided", () => {
      const options = { cause: new Error("test") };
      const result = HttpException.extractDescriptionAndOptionsFrom(options);
      
      expect(result).toEqual({
        description: "Http Exception",
        httpExceptionOptions: options
      });
    });

    it("should handle empty object", () => {
      const result = HttpException.extractDescriptionAndOptionsFrom({});
      
      expect(result).toEqual({
        description: "Http Exception",
        httpExceptionOptions: {}
      });
    });
  });

  describe("extended class behavior", () => {
    class CustomHttpException extends HttpException {}

    it("should work with extended classes", () => {
      const exception = new CustomHttpException("Custom message", HttpStatus.BAD_REQUEST);
      
      expect(exception).toBeInstanceOf(HttpException);
      expect(exception).toBeInstanceOf(CustomHttpException);
      expect(exception.name).toBe("CustomHttpException");
      expect(exception.message).toBe("Custom message");
    });

    it("should generate message from extended class name", () => {
      const exception = new CustomHttpException({}, HttpStatus.BAD_REQUEST);
      
      expect(exception.message).toBe("Custom Http Exception");
    });

    class ValidationException extends HttpException {}

    it("should handle complex class names", () => {
      const exception = new ValidationException({ data: "test" }, HttpStatus.BAD_REQUEST);
      
      expect(exception.message).toBe("Validation Exception");
      expect(exception.name).toBe("ValidationException");
    });
  });

  describe("edge cases", () => {
    it("should handle undefined info", () => {
      const exception = new HttpException(undefined as any, HttpStatus.BAD_REQUEST);
      
      expect(exception.getInfo()).toBeUndefined();
    });

    it("should handle null info", () => {
      const exception = new HttpException(null as any, HttpStatus.BAD_REQUEST);
      
      expect(exception.getInfo()).toBeNull();
    });

    it("should handle zero status code", () => {
      const exception = new HttpException("Test", 0);
      
      expect(exception.getStatus()).toBe(0);
    });

    it("should handle negative status code", () => {
      const exception = new HttpException("Test", -1);
      
      expect(exception.getStatus()).toBe(-1);
    });

    it("should handle very large status code", () => {
      const exception = new HttpException("Test", 999999);
      
      expect(exception.getStatus()).toBe(999999);
    });

    it("should handle object with non-string message property", () => {
      const info = { message: 123, data: "test" };
      const exception = new HttpException(info, HttpStatus.BAD_REQUEST);
      
      expect(exception.message).toBe("Http Exception");
    });

    it("should handle circular reference in info object", () => {
      const info: any = { data: "test" };
      info.self = info;
      
      const exception = new HttpException(info, HttpStatus.BAD_REQUEST);
      
      expect(exception.getInfo()).toBe(info);
      expect(exception.message).toBe("Http Exception");
    });
  });

  describe("error inheritance", () => {
    it("should properly extend Error", () => {
      const exception = new HttpException("Test", HttpStatus.BAD_REQUEST);
      
      expect(exception.stack).toBeDefined();
      expect(exception.toString()).toContain("HttpException");
      expect(exception instanceof Error).toBe(true);
    });

    it("should be catchable as Error", () => {
      let caughtError: Error | null = null;
      
      try {
        throw new HttpException("Test error", HttpStatus.BAD_REQUEST);
      } catch (error) {
        caughtError = error as Error;
      }
      
      expect(caughtError).toBeInstanceOf(Error);
      expect(caughtError).toBeInstanceOf(HttpException);
      expect(caughtError?.message).toBe("Test error");
    });
  });

  describe("real-world scenarios", () => {
    it("should handle validation errors", () => {
      const validationErrors = [
        "Name is required",
        "Email must be valid",
        "Age must be a number"
      ];
      
      const exception = new HttpException(validationErrors, HttpStatus.BAD_REQUEST);
      
      expect(exception.getInfo()).toEqual(validationErrors);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });

    it("should handle authentication errors with cause", () => {
      const cause = new Error("JWT token expired");
      const exception = new HttpException(
        "Authentication failed",
        HttpStatus.UNAUTHORIZED,
        { cause, description: "Token validation failed" }
      );
      
      expect(exception.cause).toBe(cause);
      expect(exception.message).toBe("Authentication failed");
      expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    });

    it("should handle API response with custom format", () => {
      const apiResponse = {
        error: {
          code: "RESOURCE_NOT_FOUND",
          message: "The requested user was not found",
          details: { userId: "123", timestamp: new Date().toISOString() }
        },
        statusCode: 404
      };
      
      const body = HttpException.createBody(apiResponse);
      
      expect(body).toEqual(apiResponse);
    });
  });
});