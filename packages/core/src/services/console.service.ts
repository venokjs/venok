import type { InspectOptions } from "util";

import type { ConsoleLoggerOptions, LoggerService, LogLevel } from "~/interfaces/index.js";

import { inspect } from "util";

import { colors, isColorAllowed, yellow } from "~/helpers/color.helper.js";
import { isFunction, isPlainObject, isString, isUndefined } from "~/helpers/shared.helper.js";
import { Injectable } from "~/decorators/injectable.decorator.js";
import { isLogLevelEnabled } from "~/helpers/is-log-level-enabled.helper.js";
import { Optional } from "~/decorators/optional.decorator.js";

const DEFAULT_DEPTH = 5;

const DEFAULT_LOG_LEVELS: LogLevel[] = ["log", "error", "warn", "debug", "verbose", "fatal"];

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  day: "2-digit",
  month: "2-digit",
});

/**
 * @publicApi
 */
@Injectable()
export class ConsoleLogger implements LoggerService {
  /**
   * The options of the logger.
   */
  protected options: ConsoleLoggerOptions;
  /**
   * The context of the logger (can be set manually or automatically inferred).
   */
  protected context?: string;
  /**
   * The original context of the logger (set in the constructor).
   */
  protected originalContext?: string;
  /**
   * The options used for the "inspect" method.
   */
  protected inspectOptions: InspectOptions;
  /**
   * The last timestamp at which the log message was printed.
   */
  protected static lastTimestampAt?: number;

  constructor();
  constructor(context: string);
  constructor(options: ConsoleLoggerOptions);
  constructor(context: string, options: ConsoleLoggerOptions);
  constructor(
    @Optional()
    contextOrOptions?: string | ConsoleLoggerOptions,
    @Optional()
    options?: ConsoleLoggerOptions
  ) {
    // eslint-disable-next-line prefer-const
    let [context, opts] = isString(contextOrOptions)
      ? [contextOrOptions, options]
      : options
        ? [undefined, options]
        : [contextOrOptions?.context, contextOrOptions];

    opts = opts ?? {};
    opts.logLevels ??= DEFAULT_LOG_LEVELS;
    opts.colors ??= opts.colors ?? (opts.json ? false : isColorAllowed());
    opts.prefix ??= "Venok";

    this.options = opts;
    this.inspectOptions = this.getInspectOptions();

    if (context) {
      this.context = context;
      this.originalContext = context;
    }
  }

  /**
   * Write a 'log' level log, if the configured level allows for it.
   * Prints to `stdout` with newline.
   */
  log(message: any, context?: string): void;
  log(message: any, ...optionalParams: [...any, string?]): void;
  log(message: any, ...optionalParams: any[]) {
    if (!this.isLevelEnabled("log")) {
      return;
    }
    const { messages, context } = this.getContextAndMessagesToPrint([message, ...optionalParams]);
    this.printMessages(messages, context, "log");
  }

  /**
   * Write an 'error' level log, if the configured level allows for it.
   * Prints to `stderr` with newline.
   */
  error(message: any, stackOrContext?: string): void;
  error(message: any, stack?: string, context?: string): void;
  error(message: any, ...optionalParams: [...any, string?, string?]): void;
  error(message: any, ...optionalParams: any[]) {
    if (!this.isLevelEnabled("error")) {
      return;
    }
    const { messages, context, stack } = this.getContextAndStackAndMessagesToPrint([message, ...optionalParams]);

    this.printMessages(messages, context, "error", "stderr", stack);
    this.printStackTrace(stack!);
  }

  /**
   * Write a 'warn' level log, if the configured level allows for it.
   * Prints to `stdout` with newline.
   */
  warn(message: any, context?: string): void;
  warn(message: any, ...optionalParams: [...any, string?]): void;
  warn(message: any, ...optionalParams: any[]) {
    if (!this.isLevelEnabled("warn")) {
      return;
    }
    const { messages, context } = this.getContextAndMessagesToPrint([message, ...optionalParams]);
    this.printMessages(messages, context, "warn");
  }

  /**
   * Write a 'debug' level log, if the configured level allows for it.
   * Prints to `stdout` with newline.
   */
  debug(message: any, context?: string): void;
  debug(message: any, ...optionalParams: [...any, string?]): void;
  debug(message: any, ...optionalParams: any[]) {
    if (!this.isLevelEnabled("debug")) {
      return;
    }
    const { messages, context } = this.getContextAndMessagesToPrint([message, ...optionalParams]);
    this.printMessages(messages, context, "debug");
  }

  /**
   * Write a 'verbose' level log, if the configured level allows for it.
   * Prints to `stdout` with newline.
   */
  verbose(message: any, context?: string): void;
  verbose(message: any, ...optionalParams: [...any, string?]): void;
  verbose(message: any, ...optionalParams: any[]) {
    if (!this.isLevelEnabled("verbose")) {
      return;
    }
    const { messages, context } = this.getContextAndMessagesToPrint([message, ...optionalParams]);
    this.printMessages(messages, context, "verbose");
  }

  /**
   * Write a 'fatal' level log, if the configured level allows for it.
   * Prints to `stdout` with newline.
   */
  fatal(message: any, context?: string): void;
  fatal(message: any, ...optionalParams: [...any, string?]): void;
  fatal(message: any, ...optionalParams: any[]) {
    if (!this.isLevelEnabled("fatal")) {
      return;
    }
    const { messages, context } = this.getContextAndMessagesToPrint([message, ...optionalParams]);
    this.printMessages(messages, context, "fatal");
  }

  /**
   * Set log levels
   * @param levels log levels
   */
  setLogLevels(levels: LogLevel[]) {
    if (!this.options) {
      this.options = {};
    }
    this.options.logLevels = levels;
  }

  /**
   * Set logger context
   * @param context context
   */
  setContext(context: string) {
    this.context = context;
  }

  /**
   * Resets the logger context to the value that was passed in the constructor.
   */
  resetContext() {
    this.context = this.originalContext;
  }

  isLevelEnabled(level: LogLevel): boolean {
    const logLevels = this.options?.logLevels;
    return isLogLevelEnabled(level, logLevels);
  }

  protected getTimestamp(): string {
    return dateTimeFormatter.format(Date.now());
  }

  protected printMessages(
    messages: unknown[],
    context = "",
    logLevel: LogLevel = "log",
    writeStreamType?: "stdout" | "stderr",
    errorStack?: unknown
  ) {
    messages.forEach((message) => {
      if (this.options.json) {
        this.printAsJson(message, {
          context,
          logLevel,
          writeStreamType,
          errorStack,
        });
        return;
      }
      const pidMessage = this.formatPid(process.pid);
      const contextMessage = this.formatContext(context);
      const timestampDiff = this.updateAndGetTimestampDiff();
      const formattedLogLevel = logLevel.toUpperCase().padStart(7, " ");
      const formattedMessage = this.formatMessage(
        logLevel,
        message,
        pidMessage,
        formattedLogLevel,
        contextMessage,
        timestampDiff
      );

      if (this.options.forceConsole) {
        if (writeStreamType === "stderr") {
          console.error(formattedMessage.trim());
        } else {
          console.log(formattedMessage.trim());
        }
      } else {
        process[writeStreamType ?? "stdout"].write(formattedMessage);
      }
    });
  }

  protected printAsJson(
    message: unknown,
    options: {
      context: string;
      logLevel: LogLevel;
      writeStreamType?: "stdout" | "stderr";
      errorStack?: unknown;
    }
  ) {
    const logObject = this.getJsonLogObject(message, options);
    const formattedMessage =
      !this.options.colors && this.inspectOptions.compact === true
        // eslint-disable-next-line @typescript-eslint/unbound-method
        ? JSON.stringify(logObject, this.stringifyReplacer)
        : inspect(logObject, this.inspectOptions);
    if (this.options.forceConsole) {
      if (options.writeStreamType === "stderr") {
        console.error(formattedMessage);
      } else {
        console.log(formattedMessage);
      }
    } else {
      process[options.writeStreamType ?? "stdout"].write(`${formattedMessage}\n`);
    }
  }

  protected getJsonLogObject(
    message: unknown,
    options: {
      context: string;
      logLevel: LogLevel;
      writeStreamType?: "stdout" | "stderr";
      errorStack?: unknown;
    }
  ) {
    type JsonLogObject = {
      level: LogLevel;
      pid: number;
      timestamp: number;
      message: unknown;
      context?: string;
      stack?: unknown;
    };

    const logObject: JsonLogObject = {
      level: options.logLevel,
      pid: process.pid,
      timestamp: Date.now(),
      message,
    };

    if (options.context) {
      logObject.context = options.context;
    }

    if (options.errorStack) {
      logObject.stack = options.errorStack;
    }
    return logObject;
  }

  protected formatPid(pid: number) {
    return `[${this.options.prefix}] ${pid}  - `;
  }

  protected formatContext(context: string): string {
    if (!context) {
      return "";
    }

    context = `[${context}] `;
    return this.options.colors ? yellow(context) : context;
  }

  protected formatMessage(
    logLevel: LogLevel,
    message: unknown,
    pidMessage: string,
    formattedLogLevel: string,
    contextMessage: string,
    timestampDiff: string
  ) {
    const output = this.stringifyMessage(message, logLevel);
    pidMessage = this.colorize(pidMessage, logLevel);
    formattedLogLevel = this.colorize(formattedLogLevel, logLevel);
    return `${pidMessage}${this.getTimestamp()} ${formattedLogLevel} ${contextMessage}${output}${timestampDiff}\n`;
  }

  protected stringifyMessage(message: unknown, logLevel: LogLevel): any {
    if (isFunction(message)) {
      const messageAsStr = Function.prototype.toString.call(message);
      const isClass = messageAsStr.startsWith("class ");
      if (isClass) {
        // If the message is a class, we will display the class name.
        return this.stringifyMessage(message.name, logLevel);
      }
      // If the message is a non-class function, call it and re-resolve its value.
      return this.stringifyMessage(message(), logLevel);
    }

    if (typeof message === "string") {
      return this.colorize(message, logLevel);
    }

    const outputText = inspect(message, this.inspectOptions);
    if (isPlainObject(message)) {
      return `Object(${Object.keys(message).length}) ${outputText}`;
    }
    if (Array.isArray(message)) {
      return `Array(${message.length}) ${outputText}`;
    }
    return outputText;
  }

  protected colorize(message: string, logLevel: LogLevel) {
    if (!this.options.colors || this.options.json) {
      return message;
    }
    const color = this.getColorByLogLevel(logLevel);
    return color(message);
  }

  protected printStackTrace(stack: string) {
    if (!stack || this.options.json) {
      return;
    }
    if (this.options.forceConsole) {
      console.error(stack);
    } else {
      process.stderr.write(`${stack}\n`);
    }
  }

  protected updateAndGetTimestampDiff(): string {
    const includeTimestamp = ConsoleLogger.lastTimestampAt && this.options?.timestamp;
    const result = includeTimestamp ? this.formatTimestampDiff(Date.now() - ConsoleLogger.lastTimestampAt!) : "";
    ConsoleLogger.lastTimestampAt = Date.now();
    return result;
  }

  protected formatTimestampDiff(timestampDiff: number) {
    const formattedDiff = ` +${timestampDiff}ms`;
    return this.options.colors ? yellow(formattedDiff) : formattedDiff;
  }

  protected getInspectOptions() {
    let breakLength = this.options.breakLength;
    if (typeof breakLength === "undefined") {
      breakLength = this.options.colors
        ? this.options.compact
          ? Infinity
          : undefined
        : this.options.compact === false
          ? undefined
          : Infinity; // default breakLength to Infinity if inline is not set and colors is false
    }

    const inspectOptions: InspectOptions = {
      depth: this.options.depth ?? DEFAULT_DEPTH,
      sorted: this.options.sorted,
      showHidden: this.options.showHidden,
      compact: this.options.compact ?? (this.options.json ? true : false),
      colors: this.options.colors,
      breakLength,
    };

    if (this.options.maxArrayLength) {
      inspectOptions.maxArrayLength = this.options.maxArrayLength;
    }
    if (this.options.maxStringLength) {
      inspectOptions.maxStringLength = this.options.maxStringLength;
    }

    return inspectOptions;
  }

  protected stringifyReplacer(key: string, value: unknown) {
    // Mimic util.inspect behavior for JSON logger with compact on and colors off
    if (typeof value === "bigint") {
      return value.toString();
    }
    if (typeof value === "symbol") {
      return value.toString();
    }

    if (value instanceof Map || value instanceof Set || value instanceof Error) {
      return `${inspect(value, this.inspectOptions)}`;
    }
    return value;
  }

  private getContextAndMessagesToPrint(args: unknown[]) {
    if (args?.length <= 1) {
      return { messages: args, context: this.context };
    }
    const lastElement = args[args.length - 1];
    const isContext = isString(lastElement);
    if (!isContext) {
      return { messages: args, context: this.context };
    }
    return {
      context: lastElement,
      messages: args.slice(0, args.length - 1),
    };
  }

  private getContextAndStackAndMessagesToPrint(args: unknown[]) {
    if (args.length === 2) {
      return this.isStackFormat(args[1])
        ? {
            messages: [args[0]],
            stack: args[1] as string,
            context: this.context,
          }
        : {
            messages: [args[0]],
            context: args[1] as string,
          };
    }

    const { messages, context } = this.getContextAndMessagesToPrint(args);
    if (messages?.length <= 1) {
      return { messages, context };
    }
    const lastElement = messages[messages.length - 1];
    const isStack = isString(lastElement);
    // https://github.com/nestjs/nest/issues/11074#issuecomment-1421680060
    if (!isStack && !isUndefined(lastElement)) {
      return { messages, context };
    }
    return {
      stack: lastElement,
      messages: messages.slice(0, messages.length - 1),
      context,
    };
  }

  private isStackFormat(stack: unknown) {
    if (!isString(stack) && !isUndefined(stack)) {
      return false;
    }

    return /^(.)+\n\s+at .+:\d+:\d+/.test(stack!);
  }

  private getColorByLogLevel(level: LogLevel) {
    switch (level) {
      case "debug":
        return colors.magentaBright;
      case "warn":
        return colors.yellow;
      case "error":
        return colors.red;
      case "verbose":
        return colors.cyanBright;
      case "fatal":
        return colors.bold;
      default:
        return colors.green;
    }
  }
}
