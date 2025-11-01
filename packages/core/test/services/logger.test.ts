/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unused-vars */
import type { LoggerService, LogLevel } from "~/interfaces/index.js";

import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";

import { Logger } from "~/services/logger.service.js";
import { ConsoleLogger } from "~/services/console.service.js";

describe("Logger", () => {
  describe("[static methods]", () => {
    describe("when the default logger is used", () => {
      let processStdoutWriteSpy: ReturnType<typeof spyOn>;
      let processStderrWriteSpy: ReturnType<typeof spyOn>;

      beforeEach(() => {
        processStdoutWriteSpy = spyOn(process.stdout, "write");
        processStderrWriteSpy = spyOn(process.stderr, "write");
      });

      afterEach(() => {
        processStdoutWriteSpy.mockRestore();
        processStderrWriteSpy.mockRestore();
      });

      it("should print one message to the console", () => {
        const message = "random message";
        const context = "RandomContext";

        Logger.log(message, context);

        expect(processStdoutWriteSpy).toHaveBeenCalledTimes(1);
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(
          `[${context}]`
        );
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(message);
      });

      it("should print one message without context to the console", () => {
        const message = "random message without context";

        Logger.log(message);

        expect(processStdoutWriteSpy).toHaveBeenCalledTimes(1);
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(message);
      });

      it("should print multiple messages to the console", () => {
        const messages = ["message 1", "message 2", "message 3"];
        const context = "RandomContext";

        Logger.log(messages[0], messages[1], messages[2], context);

        expect(processStdoutWriteSpy).toHaveBeenCalledTimes(3);
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(
          `[${context}]`
        );
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(
          messages[0]
        );

        expect(processStdoutWriteSpy.mock.calls[1][0]).toContain(
          `[${context}]`
        );
        expect(processStdoutWriteSpy.mock.calls[1][0]).toContain(
          messages[1]
        );

        expect(processStdoutWriteSpy.mock.calls[2][0]).toContain(
          `[${context}]`
        );
        expect(processStdoutWriteSpy.mock.calls[2][0]).toContain(
          messages[2]
        );
      });

      it("should print one error to the console with context", () => {
        const message = "random error";
        const context = "RandomContext";

        Logger.error(message, context);

        expect(processStderrWriteSpy).toHaveBeenCalledTimes(1);
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(
          `[${context}]`
        );
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(message);
      });

      it("should print one error to the console with stacktrace", () => {
        const message = "random error";
        const stacktrace = "Error: message\n    at <anonymous>:1:2";

        Logger.error(message, stacktrace);

        expect(processStderrWriteSpy).toHaveBeenCalledTimes(2);
        expect(processStderrWriteSpy.mock.calls[0][0]).not.toContain(`[]`);
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(message);
        expect(processStderrWriteSpy.mock.calls[1][0]).toBe(
          stacktrace + "\n"
        );
      });

      it("should print one error without context to the console", () => {
        const message = "random error without context";

        Logger.error(message);

        expect(processStderrWriteSpy).toHaveBeenCalledTimes(1);
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(message);
      });

      it("should print error object without context to the console", () => {
        const error = new Error("Random text here");

        Logger.error(error);

        expect(processStderrWriteSpy).toHaveBeenCalledTimes(1);
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(
          `Error: Random text here`
        );
      });

      it("should serialise a plain JS object (as a message) without context to the console", () => {
        const error = {
          randomError: true,
        };

        Logger.error(error);

        expect(processStderrWriteSpy).toHaveBeenCalledTimes(1);

        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(
          `Object(${Object.keys(error).length})`
        );
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(
          `randomError: \x1b[33mtrue`
        );
      });

      it("should print one error with stacktrace and context to the console", () => {
        const message = "random error with context";
        const stacktrace = "stacktrace";
        const context = "ErrorContext";

        Logger.error(message, stacktrace, context);

        expect(processStderrWriteSpy).toHaveBeenCalledTimes(2);

        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(
          `[${context}]`
        );
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(message);

        expect(processStderrWriteSpy.mock.calls[1][0]).toBe(
          stacktrace + "\n"
        );
        expect(processStderrWriteSpy.mock.calls[1][0]).not.toContain(
          context
        );
      });

      it("should print multiple 2 errors and one stacktrace to the console", () => {
        const messages = ["message 1", "message 2"];
        const stack = "stacktrace";
        const context = "RandomContext";

        Logger.error(messages[0], messages[1], stack, context);

        expect(processStderrWriteSpy).toHaveBeenCalledTimes(3);
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(
          `[${context}]`
        );
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(
          messages[0]
        );

        expect(processStderrWriteSpy.mock.calls[1][0]).toContain(
          `[${context}]`
        );
        expect(processStderrWriteSpy.mock.calls[1][0]).toContain(
          messages[1]
        );

        expect(processStderrWriteSpy.mock.calls[2][0]).not.toContain(
          `[${context}]`
        );
        expect(processStderrWriteSpy.mock.calls[2][0]).toBe(stack + "\n");
      });

      it("should print one warn message to the console with context", () => {
        const message = "random warning";
        const context = "RandomContext";

        Logger.warn(message, context);

        expect(processStdoutWriteSpy).toHaveBeenCalledTimes(1);
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(
          `[${context}]`
        );
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(message);
      });

      it("should print one debug message to the console with context", () => {
        const message = "random debug";
        const context = "RandomContext";

        Logger.debug(message, context);

        expect(processStdoutWriteSpy).toHaveBeenCalledTimes(1);
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(
          `[${context}]`
        );
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(message);
      });

      it("should print one verbose message to the console with context", () => {
        const message = "random verbose";
        const context = "RandomContext";

        Logger.verbose(message, context);

        expect(processStdoutWriteSpy).toHaveBeenCalledTimes(1);
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(
          `[${context}]`
        );
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(message);
      });

      it("should print one fatal message to the console with context", () => {
        const message = "random fatal";
        const context = "RandomContext";

        Logger.fatal(message, context);

        expect(processStdoutWriteSpy).toHaveBeenCalledTimes(1);
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(
          `[${context}]`
        );
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(message);
      });
    });

    describe("when the default logger is used and json mode is enabled", () => {
      const logger = new ConsoleLogger({ json: true });

      let processStdoutWriteSpy: ReturnType<typeof spyOn>;
      let processStderrWriteSpy: ReturnType<typeof spyOn>;

      beforeEach(() => {
        processStdoutWriteSpy = spyOn(process.stdout, "write");
        processStderrWriteSpy = spyOn(process.stderr, "write");
      });

      afterEach(() => {
        processStdoutWriteSpy.mockRestore();
        processStderrWriteSpy.mockRestore();
      });

      it("should print error with stack as JSON to the console", () => {
        const errorMessage = "error message";
        const error = new Error(errorMessage);

        logger.error(error.message, error.stack);

        const json = JSON.parse(processStderrWriteSpy.mock.calls[0][0]);

        expect(json.pid).toBe(process.pid);
        expect(json.level).toBe("error");
        expect(json.message).toBe(errorMessage);
      });
      it("should log out to stdout as JSON", () => {
        const message = "message 1";

        logger.log(message);

        const json = JSON.parse(processStdoutWriteSpy.mock.calls[0][0]);

        expect(json.pid).toBe(process.pid);
        expect(json.level).toBe("log");
        expect(json.message).toBe(message);
      });
      it("should log out an error to stderr as JSON", () => {
        const message = "message 1";

        logger.error(message);

        const json = JSON.parse(processStderrWriteSpy.mock.calls[0][0]);

        expect(json.pid).toBe(process.pid);
        expect(json.level).toBe("error");
        expect(json.message).toBe(message);
      });
      it("should log Map object", () => {
        const map = new Map([
          ["key1", "value1"],
          ["key2", "value2"],
        ]);

        logger.log(map);

        const json = JSON.parse(processStdoutWriteSpy.mock.calls[0][0]);

        expect(json.pid).toBe(process.pid);
        expect(json.level).toBe("log");
        expect(json.message).toBe(
          `Map(2) { 'key1' => 'value1', 'key2' => 'value2' }`
        );
      });
      it("should log Set object", () => {
        const set = new Set(["value1", "value2"]);

        logger.log(set);

        const json = JSON.parse(processStdoutWriteSpy.mock.calls[0][0]);

        expect(json.pid).toBe(process.pid);
        expect(json.level).toBe("log");
        expect(json.message).toBe(`Set(2) { 'value1', 'value2' }`);
      });
      it("should log bigint", () => {
        const bigInt = BigInt(9007199254740991);

        logger.log(bigInt);

        const json = JSON.parse(processStdoutWriteSpy.mock.calls[0][0]);

        expect(json.pid).toBe(process.pid);
        expect(json.level).toBe("log");
        expect(json.message).toBe("9007199254740991");
      });
      it("should log symbol", () => {
        const symbol = Symbol("test");

        logger.log(symbol);

        const json = JSON.parse(processStdoutWriteSpy.mock.calls[0][0]);

        expect(json.pid).toBe(process.pid);
        expect(json.level).toBe("log");
        expect(json.message).toBe("Symbol(test)");
      });
    });

    describe("when the default logger is used, json mode is enabled and compact is false (utils.inspect)", () => {
      const logger = new ConsoleLogger({ json: true, compact: false });

      let processStdoutWriteSpy: ReturnType<typeof spyOn>;
      let processStderrWriteSpy: ReturnType<typeof spyOn>;

      beforeEach(() => {
        processStdoutWriteSpy = spyOn(process.stdout, "write");
        processStderrWriteSpy = spyOn(process.stderr, "write");
      });

      afterEach(() => {
        processStdoutWriteSpy.mockRestore();
        processStderrWriteSpy.mockRestore();
      });

      it("should log out to stdout as JSON (utils.inspect)", () => {
        const message = "message 1";

        logger.log(message);

        const json = convertInspectToJSON(
          processStdoutWriteSpy.mock.calls[0][0]
        );

        expect(json.pid).toBe(process.pid);
        expect(json.level).toBe("log");
        expect(json.message).toBe(message);
      });

      it("should log out an error to stderr as JSON (utils.inspect)", () => {
        const message = "message 1";

        logger.error(message);

        const json = convertInspectToJSON(
          processStderrWriteSpy.mock.calls[0][0]
        );

        expect(json.pid).toBe(process.pid);
        expect(json.level).toBe("error");
        expect(json.message).toBe(message);
      });
    });

    describe("when logging is disabled", () => {
      let processStdoutWriteSpy: ReturnType<typeof spyOn>;
      let previousLoggerRef: LoggerService;

      beforeEach(() => {
        processStdoutWriteSpy = spyOn(process.stdout, "write");
        // @ts-expect-error Mismatch types
        previousLoggerRef = Logger["localInstanceRef"] || Logger["staticInstanceRef"];
        Logger.overrideLogger(false);
      });

      afterEach(() => {
        processStdoutWriteSpy.mockRestore();

        Logger.overrideLogger(previousLoggerRef);
      });

      it("should not print any message to the console", () => {
        const message = "random message";
        const context = "RandomContext";

        Logger.log(message, context);

        expect(processStdoutWriteSpy).toHaveBeenCalledTimes(0);
      });
    });
    describe("when custom logger is being used", () => {
      class CustomLogger implements LoggerService {
        log(message: any, context?: string) {}
        error(message: any, trace?: string, context?: string) {}
        warn(message: any, context?: string) {}
      }

      const customLogger = new CustomLogger();
      let previousLoggerRef: LoggerService;

      beforeEach(() => {
        // @ts-expect-error Mismatch types
        previousLoggerRef = Logger["localInstanceRef"] || Logger["staticInstanceRef"];
        Logger.overrideLogger(customLogger);
      });

      afterEach(() => {
        Logger.overrideLogger(previousLoggerRef);
      });

      it('should call custom logger "#log()" method', () => {
        const message = "random message";
        const context = "RandomContext";

        const customLoggerLogSpy = spyOn(customLogger, "log");

        Logger.log(message, context);

        expect(customLoggerLogSpy).toHaveBeenCalledTimes(1);
        expect(customLoggerLogSpy).toHaveBeenCalledWith(message, context);
      });

      it('should call custom logger "#error()" method', () => {
        const message = "random message";
        const context = "RandomContext";

        const customLoggerErrorSpy = spyOn(customLogger, "error");

        Logger.error(message, context);

        expect(customLoggerErrorSpy).toHaveBeenCalledTimes(1);
        expect(customLoggerErrorSpy).toHaveBeenCalledWith(message, context);
      });
    });

    describe("buffer management", () => {
      let processStdoutWriteSpy: ReturnType<typeof spyOn>;
      let processStderrWriteSpy: ReturnType<typeof spyOn>;

      beforeEach(() => {
        processStdoutWriteSpy = spyOn(process.stdout, "write");
        processStderrWriteSpy = spyOn(process.stderr, "write");
      });

      afterEach(() => {
        processStdoutWriteSpy.mockRestore();
        processStderrWriteSpy.mockRestore();
        Logger.detachBuffer();
      });

      it("should buffer logs when buffer is attached", () => {
        Logger.attachBuffer();
        
        Logger.log("test message 1");
        Logger.error("test error 1");
        
        expect(processStdoutWriteSpy).toHaveBeenCalledTimes(0);
        expect(processStderrWriteSpy).toHaveBeenCalledTimes(0);
      });

      it("should flush buffered logs when flush is called", () => {
        Logger.attachBuffer();
        
        Logger.log("test message 1");
        Logger.log("test message 2");
        Logger.error("test error 1");
        
        expect(processStdoutWriteSpy).toHaveBeenCalledTimes(0);
        expect(processStderrWriteSpy).toHaveBeenCalledTimes(0);
        
        Logger.flush();
        
        expect(processStdoutWriteSpy).toHaveBeenCalledWith(
          expect.stringContaining("test message 1")
        );
        expect(processStdoutWriteSpy).toHaveBeenCalledWith(
          expect.stringContaining("test message 2")
        );
        expect(processStderrWriteSpy).toHaveBeenCalledWith(
          expect.stringContaining("test error 1")
        );
      });

      it("should detach buffer and prevent buffering", () => {
        Logger.attachBuffer();
        Logger.detachBuffer();
        
        Logger.log("test message");
        
        expect(processStdoutWriteSpy).toHaveBeenCalledTimes(1);
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain("test message");
      });
    });

    describe("utility methods", () => {
      it("should return formatted timestamp", () => {
        const timestamp = Logger.getTimestamp();
        
        expect(typeof timestamp).toBe("string");
        expect(timestamp).toMatch(/\d{2}\/\d{2}\/\d{4},\s\d{1,2}:\d{2}:\d{2}\s(AM|PM)/);
      });

      it("should check if log level is enabled", () => {
        Logger.overrideLogger(["error", "warn"]);
        
        expect(Logger.isLevelEnabled("error")).toBe(true);
        expect(Logger.isLevelEnabled("warn")).toBe(true);
        expect(Logger.isLevelEnabled("log")).toBe(false);
        expect(Logger.isLevelEnabled("debug")).toBe(false);
        
        Logger.overrideLogger(["verbose", "debug", "log", "warn", "error", "fatal"]);
        
        expect(Logger.isLevelEnabled("verbose")).toBe(true);
        expect(Logger.isLevelEnabled("debug")).toBe(true);
        expect(Logger.isLevelEnabled("log")).toBe(true);
        expect(Logger.isLevelEnabled("warn")).toBe(true);
        expect(Logger.isLevelEnabled("error")).toBe(true);
        expect(Logger.isLevelEnabled("fatal")).toBe(true);
      });
    });
  });

  describe("ConsoleLogger", () => {
    it("should allow setting and resetting of context", () => {
      const logger = new ConsoleLogger();
      expect(logger["context"]).toBeUndefined();
      logger.setContext("context");
      expect(logger["context"]).toBe("context");
      logger.resetContext();
      expect(logger["context"]).toBeUndefined();

      const loggerWithContext = new ConsoleLogger("context");
      expect(loggerWithContext["context"]).toBe("context");
      loggerWithContext.setContext("other");
      expect(loggerWithContext["context"]).toBe("other");
      loggerWithContext.resetContext();
      expect(loggerWithContext["context"]).toBe("context");
    });

    describe("functions for message", () => {
      let processStdoutWriteSpy: ReturnType<typeof spyOn>;
      const logger = new ConsoleLogger();
      const message = "Hello World";

      beforeEach(() => {
        processStdoutWriteSpy = spyOn(process.stdout, "write");
      });
      afterEach(() => {
        processStdoutWriteSpy.mockRestore();
      });

      it("works", () => {
        logger.log(() => message);

        expect(processStdoutWriteSpy).toHaveBeenCalledTimes(1);
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(message);
        // Ensure we didn't serialize the function itself.
        expect(processStdoutWriteSpy.mock.calls[0][0]).not.toContain(" => ");
        expect(processStdoutWriteSpy.mock.calls[0][0]).not.toContain(
          "function"
        );
        expect(processStdoutWriteSpy.mock.calls[0][0]).not.toContain(
          "Function"
        );
      });
    });

    describe("classes for message", () => {
      let processStdoutWriteSpy: ReturnType<typeof spyOn>;

      beforeEach(() => {
        processStdoutWriteSpy = spyOn(process.stdout, "write");
      });
      afterEach(() => {
        processStdoutWriteSpy.mockRestore();
      });

      it("should display class's name or empty for anonymous classes", () => {
        const logger = new ConsoleLogger();

        // in-line anonymous class
        logger.log(class {});

        // named class
        class Test {
          publicField = "public field";
        }
        logger.log(Test);

        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain("");
        expect(processStdoutWriteSpy.mock.calls[1][0]).toContain(Test.name);
      });
    });

    describe("forceConsole option", () => {
      let consoleLogSpy: ReturnType<typeof spyOn>;
      let consoleErrorSpy: ReturnType<typeof spyOn>;
      let processStdoutWriteStub: ReturnType<typeof spyOn>;
      let processStderrWriteStub: ReturnType<typeof spyOn>;

      beforeEach(() => {
        // Stub process.stdout.write to prevent actual output and track calls
        processStdoutWriteStub = spyOn(process.stdout, "write");
        processStderrWriteStub = spyOn(process.stderr, "write");
        consoleLogSpy = spyOn(console, "log");
        consoleErrorSpy = spyOn(console, "error");
      });

      afterEach(() => {
        processStdoutWriteStub.mockRestore();
        processStderrWriteStub.mockRestore();
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
      });

      it("should use console.log instead of process.stdout.write when forceConsole is true", () => {
        const logger = new ConsoleLogger({ forceConsole: true });
        const message = "test message";

        logger.log(message);

        // When forceConsole is true, console.log should be called
        expect(consoleLogSpy).toHaveBeenCalledTimes(1);
        expect(consoleLogSpy.mock.calls[0][0]).toContain(message);
      });

      it("should use console.error instead of process.stderr.write when forceConsole is true", () => {
        const logger = new ConsoleLogger({ forceConsole: true });
        const message = "error message";

        logger.error(message);

        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy.mock.calls[0][0]).toContain(message);
      });

      it("should use console.error for stack traces when forceConsole is true", () => {
        const logger = new ConsoleLogger({ forceConsole: true });
        const message = "error with stack";
        const stack = "Error: test\n    at <anonymous>:1:1";

        logger.error(message, stack);

        expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
        expect(consoleErrorSpy.mock.calls[0][0]).toContain(message);
        expect(consoleErrorSpy.mock.calls[1][0]).toBe(stack);
      });

      it("should use process.stdout.write when forceConsole is false", () => {
        const logger = new ConsoleLogger({ forceConsole: false });
        const message = "test message";

        logger.log(message);

        expect(processStdoutWriteStub).toHaveBeenCalledTimes(1);
        expect(processStdoutWriteStub.mock.calls[0][0]).toContain(message);
        expect(consoleLogSpy).toHaveBeenCalledTimes(0);
      });

      it("should work with JSON mode and forceConsole", () => {
        const logger = new ConsoleLogger({ json: true, forceConsole: true });
        const message = "json message";

        logger.log(message);

        expect(consoleLogSpy).toHaveBeenCalledTimes(1);

        const output = consoleLogSpy.mock.calls[0][0];
        const json = JSON.parse(output);
        expect(json.message).toBe(message);
      });
    });
  });

  describe("[instance methods]", () => {
    describe("when the default logger is used", () => {
      const logger = new Logger();

      let processStdoutWriteSpy: ReturnType<typeof spyOn>;
      let processStderrWriteSpy: ReturnType<typeof spyOn>;

      beforeEach(() => {
        processStdoutWriteSpy = spyOn(process.stdout, "write");
        processStderrWriteSpy = spyOn(process.stderr, "write");
      });

      afterEach(() => {
        processStdoutWriteSpy.mockRestore();
        processStderrWriteSpy.mockRestore();
      });

      it("should print one message to the console", () => {
        const message = "random message";
        const context = "RandomContext";

        logger.log(message, context);

        expect(processStdoutWriteSpy).toHaveBeenCalledTimes(1);
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(
          `[${context}]`
        );
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(message);
      });

      it("should print one message without context to the console", () => {
        const message = "random message without context";

        logger.log(message);

        expect(processStdoutWriteSpy).toHaveBeenCalledTimes(1);
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(message);
      });

      it("should print multiple messages to the console", () => {
        const messages = ["message 1", "message 2", "message 3"];
        const context = "RandomContext";

        logger.log(messages[0], messages[1], messages[2], context);

        expect(processStdoutWriteSpy).toHaveBeenCalledTimes(3);
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(
          `[${context}]`
        );
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(
          messages[0]
        );

        expect(processStdoutWriteSpy.mock.calls[1][0]).toContain(
          `[${context}]`
        );
        expect(processStdoutWriteSpy.mock.calls[1][0]).toContain(
          messages[1]
        );

        expect(processStdoutWriteSpy.mock.calls[2][0]).toContain(
          `[${context}]`
        );
        expect(processStdoutWriteSpy.mock.calls[2][0]).toContain(
          messages[2]
        );
      });

      it("should print one error to the console with context", () => {
        const message = "random error";
        const context = "RandomContext";

        logger.error(message, context);

        expect(processStderrWriteSpy).toHaveBeenCalledTimes(1);
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(
          `[${context}]`
        );
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(message);
      });

      it("should print one error to the console with stacktrace", () => {
        const message = "random error";
        const stacktrace = new Error("err").stack;

        logger.error(message, stacktrace);

        expect(processStderrWriteSpy).toHaveBeenCalledTimes(2);
        expect(processStderrWriteSpy.mock.calls[0][0]).not.toContain(`[]`);
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(message);
        expect(processStderrWriteSpy.mock.calls[1][0]).toBe(
          stacktrace + "\n"
        );
      });

      it("should print one error without context to the console", () => {
        const message = "random error without context";

        logger.error(message);

        expect(processStderrWriteSpy).toHaveBeenCalledTimes(1);
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(message);
      });

      it("should print one error with stacktrace and context to the console", () => {
        const message = "random error with context";
        const stacktrace = "stacktrace";
        const context = "ErrorContext";

        logger.error(message, stacktrace, context);

        expect(processStderrWriteSpy).toHaveBeenCalledTimes(2);

        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(
          `[${context}]`
        );
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(message);

        expect(processStderrWriteSpy.mock.calls[1][0]).toBe(
          stacktrace + "\n"
        );
      });

      it("should print 2 errors and one stacktrace to the console", () => {
        const messages = ["message 1", "message 2"];
        const stack = "stacktrace";
        const context = "RandomContext";

        logger.error(messages[0], messages[1], stack, context);

        expect(processStderrWriteSpy).toHaveBeenCalledTimes(3);
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(
          `[${context}]`
        );
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(
          messages[0]
        );

        expect(processStderrWriteSpy.mock.calls[1][0]).toContain(
          `[${context}]`
        );
        expect(processStderrWriteSpy.mock.calls[1][0]).toContain(
          messages[1]
        );

        expect(processStderrWriteSpy.mock.calls[2][0]).not.toContain(
          `[${context}]`
        );
        expect(processStderrWriteSpy.mock.calls[2][0]).toBe(stack + "\n");
      });

      it("should print one warn message to the console with context", () => {
        const message = "random warning";
        const context = "RandomContext";

        logger.warn(message, context);

        expect(processStdoutWriteSpy).toHaveBeenCalledTimes(1);
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(
          `[${context}]`
        );
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(message);
      });

      it("should print one debug message to the console with context", () => {
        const message = "random debug";
        const context = "RandomContext";

        logger.debug(message, context);

        expect(processStdoutWriteSpy).toHaveBeenCalledTimes(1);
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(
          `[${context}]`
        );
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(message);
      });

      it("should print one verbose message to the console with context", () => {
        const message = "random verbose";
        const context = "RandomContext";

        logger.verbose(message, context);

        expect(processStdoutWriteSpy).toHaveBeenCalledTimes(1);
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(
          `[${context}]`
        );
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(message);
      });

      it("should print one fatal message to the console with context", () => {
        const message = "random fatal";
        const context = "RandomContext";

        logger.fatal(message, context);

        expect(processStdoutWriteSpy).toHaveBeenCalledTimes(1);
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(
          `[${context}]`
        );
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(message);
      });
    });

    describe("when the default logger is used and global context is set and timestamp enabled", () => {
      const globalContext = "GlobalContext";
      const logger = new Logger(globalContext, { timestamp: true });

      let processStdoutWriteSpy: ReturnType<typeof spyOn>;
      let processStderrWriteSpy: ReturnType<typeof spyOn>;

      beforeEach(() => {
        processStdoutWriteSpy = spyOn(process.stdout, "write");
        processStderrWriteSpy = spyOn(process.stderr, "write");
      });

      afterEach(() => {
        processStdoutWriteSpy.mockRestore();
        processStderrWriteSpy.mockRestore();
      });

      it("should print multiple messages to the console and append global context", () => {
        const messages = ["message 1", "message 2", "message 3"];

        logger.log(messages[0], messages[1], messages[2]);

        expect(processStdoutWriteSpy).toHaveBeenCalledTimes(3);
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(
          `[${globalContext}]`
        );
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(
          messages[0]
        );

        expect(processStdoutWriteSpy.mock.calls[1][0]).toContain(
          `[${globalContext}]`
        );
        expect(processStdoutWriteSpy.mock.calls[1][0]).toContain(
          messages[1]
        );
        expect(processStdoutWriteSpy.mock.calls[1][0]).toContain("ms");

        expect(processStdoutWriteSpy.mock.calls[2][0]).toContain(
          `[${globalContext}]`
        );
        expect(processStdoutWriteSpy.mock.calls[2][0]).toContain(
          messages[2]
        );
        expect(processStdoutWriteSpy.mock.calls[2][0]).toContain("ms");
      });
      it("should log out an error to stderr but not include an undefined log", () => {
        const message = "message 1";

        logger.error(message);

        expect(processStderrWriteSpy).toHaveBeenCalledTimes(1);
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(
          `[${globalContext}]`
        );
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(message);
      });
    });

    describe("when logging is disabled", () => {
      const logger = new Logger();

      let processStdoutWriteSpy: ReturnType<typeof spyOn>;
      let previousLoggerRef: LoggerService;

      beforeEach(() => {
        processStdoutWriteSpy = spyOn(process.stdout, "write");
        // @ts-expect-error Mismatch types
        previousLoggerRef = Logger["localInstanceRef"] || Logger["staticInstanceRef"];
        Logger.overrideLogger(false);
      });

      afterEach(() => {
        processStdoutWriteSpy.mockRestore();

        Logger.overrideLogger(previousLoggerRef);
      });

      it("should not print any message to the console", () => {
        const message = "random message";
        const context = "RandomContext";

        logger.log(message, context);

        expect(processStdoutWriteSpy).toHaveBeenCalledTimes(0);
      });
    });

    describe("when custom logger is being used", () => {
      class CustomLogger implements LoggerService {
        log(message: any, context?: string) {}
        error(message: any, trace?: string, context?: string) {}
        warn(message: any, context?: string) {}
      }

      describe("with global context", () => {
        const customLogger = new CustomLogger();
        const globalContext = "RandomContext";
        const originalLogger = new Logger(globalContext);

        let previousLoggerRef: LoggerService;

        beforeEach(() => {
          // @ts-expect-error Mismatch types
          previousLoggerRef = Logger["localInstanceRef"] || Logger["staticInstanceRef"];
          Logger.overrideLogger(customLogger);
        });

        afterEach(() => {
          Logger.overrideLogger(previousLoggerRef);
        });

        it('should call custom logger "#log()" method with context as second argument', () => {
          const message = "random log message with global context";

          const customLoggerLogSpy = spyOn(customLogger, "log");

          originalLogger.log(message);

          expect(customLoggerLogSpy).toHaveBeenCalledTimes(1);
          expect(customLoggerLogSpy).toHaveBeenCalledWith(message, globalContext);
        });
        it('should call custom logger "#error()" method with context as third argument', () => {
          const message = "random error message with global context";

          const customLoggerErrorSpy = spyOn(customLogger, "error");

          originalLogger.error(message);

          expect(customLoggerErrorSpy).toHaveBeenCalledTimes(1);
          expect(
            customLoggerErrorSpy).toHaveBeenCalledWith(message, undefined, globalContext
          );
        });
      });
      describe("without global context", () => {
        const customLogger = new CustomLogger();
        const originalLogger = new Logger();

        let previousLoggerRef: LoggerService;

        beforeEach(() => {
          // @ts-expect-error Mismatch types
          previousLoggerRef = Logger["localInstanceRef"] || Logger["staticInstanceRef"];
          Logger.overrideLogger(customLogger);
        });

        afterEach(() => {
          Logger.overrideLogger(previousLoggerRef);
        });

        it('should call custom logger "#log()" method', () => {
          const message = "random message";
          const context = "RandomContext";

          const customLoggerLogSpy = spyOn(customLogger, "log");

          originalLogger.log(message, context);

          expect(customLoggerLogSpy).toHaveBeenCalledTimes(1);
          expect(customLoggerLogSpy).toHaveBeenCalledWith(message, context);
        });

        it('should call custom logger "#error()" method', () => {
          const message = "random message";
          const context = "RandomContext";

          const customLoggerErrorSpy = spyOn(customLogger, "error");

          originalLogger.error(message, undefined, context);

          expect(customLoggerErrorSpy).toHaveBeenCalledTimes(1);
          expect(customLoggerErrorSpy).toHaveBeenCalledWith(message, undefined, context);
        });
      });
    });
  });
  describe("ConsoleLogger", () => {
    let processStdoutWriteSpy: ReturnType<typeof spyOn>;

    beforeEach(() => {
      processStdoutWriteSpy = spyOn(process.stdout, "write");
    });
    afterEach(() => {
      processStdoutWriteSpy.mockRestore();
    });

    it("should support custom formatter", () => {
      class CustomConsoleLogger extends ConsoleLogger {
        protected formatMessage(
          logLevel: LogLevel,
          message: unknown,
          pidMessage: string,
          formattedLogLevel: string,
          contextMessage: string,
          timestampDiff: string
        ) {
          return `Prefix: ${message as string}`;
        }
      }

      const consoleLogger = new CustomConsoleLogger();
      consoleLogger.debug("test");

      expect(processStdoutWriteSpy.mock.calls[0][0]).toBe(`Prefix: test`);
    });

    it("should support custom formatter and colorizer", () => {
      class CustomConsoleLogger extends ConsoleLogger {
        protected formatMessage(
          logLevel: LogLevel,
          message: unknown,
          pidMessage: string,
          formattedLogLevel: string,
          contextMessage: string,
          timestampDiff: string
        ) {
          const strMessage = this.stringifyMessage(message, logLevel);
          return `Prefix: ${strMessage}`;
        }

        protected colorize(message: string, logLevel: LogLevel): string {
          return `~~~${message}~~~`;
        }
      }

      const consoleLogger = new CustomConsoleLogger();
      consoleLogger.debug("test");

      expect(processStdoutWriteSpy.mock.calls[0][0]).toBe(
        `Prefix: ~~~test~~~`
      );
    });

    it("should stringify messages", () => {
      class CustomConsoleLogger extends ConsoleLogger {
        protected colorize(message: string, _: LogLevel): string {
          return message;
        }
      }

      const consoleLogger = new CustomConsoleLogger({ colors: false });
      const consoleLoggerSpy = spyOn(
        consoleLogger as any,
        "stringifyMessage"
      );
      consoleLogger.debug(
        "str1",
        { key: "str2" },
        ["str3"],
        [{ key: "str4" }],
        null,
        1
      );

      expect(consoleLoggerSpy.mock.results[0].value).toBe("str1");
      expect(consoleLoggerSpy.mock.results[1].value).toBe(
        `Object(1) {
  key: 'str2'
}`
      );
      expect(consoleLoggerSpy.mock.results[2].value).toBe(
        `Array(1) [
  'str3'
]`
      );
      expect(consoleLoggerSpy.mock.results[3].value).toBe(
        `Array(1) [
  {
    key: 'str4'
  }
]`
      );
      expect(consoleLoggerSpy.mock.results[4].value).toBe("null");
      expect(consoleLoggerSpy.mock.results[5].value).toBe("1");
    });
  });
});

function convertInspectToJSON(inspectOutput: string) {
  const jsonLikeString = inspectOutput
    .replace(/'([^']+)'/g, '"$1"') // single-quoted strings
    .replace(/([a-zA-Z0-9_]+):/g, '"$1":') // unquoted object keys
    .replace(/\bundefined\b/g, "null")
    .replace(/\[Function(: [^\]]+)?\]/g, '"[Function]"')
    .replace(/\[Circular\]/g, '"[Circular]"');

  try {
    return JSON.parse(jsonLikeString);
  } catch (error) {
    console.error("Error parsing the modified inspect output:", error);
    throw error;
  }
}