import type { LogLevel } from "~/interfaces/index.js";

/**
 * @publicApi
 */
export interface ConsoleLoggerOptions {
  /**
   * Enabled log levels.
   */
  logLevels?: LogLevel[];
  /**
   * If enabled, will print timestamp (time difference) between current and previous log message.
   * Note: This option is not used when `json` is enabled.
   */
  timestamp?: boolean;
  /**
   * A prefix to be used for each log message.
   * Note: This option is not used when `json` is enabled.
   */
  prefix?: string;
  /**
   * If enabled, will print the log message in JSON format.
   */
  json?: boolean;
  /**
   * If enabled, will print the log message in color.
   * Default true if json is disabled, false otherwise
   */
  colors?: boolean;
  /**
   * The context of the logger.
   */
  context?: string;
  /**
   * If enabled, will force the use of console.log/console.error instead of process.stdout/stderr.write.
   * This is useful for test environments like Jest that can buffer console calls.
   * @default false
   */
  forceConsole?: boolean;
  /**
   * If enabled, will print the log message in a single line, even if it is an object with multiple properties.
   * If set to a number, the most n inner elements are united on a single line as long as all properties fit into breakLength. Short array elements are also grouped together.
   * Default true when `json` is enabled, false otherwise.
   */
  compact?: boolean | number;
  /**
   * Specifies the maximum number of Array, TypedArray, Map, Set, WeakMap, and WeakSet elements to include when formatting.
   * Set to null or Infinity to show all elements. Set to 0 or negative to show no elements.
   * Ignored when `json` is enabled, colors are disabled, and `compact` is set to true as it produces a parseable JSON output.
   * @default 100
   */
  maxArrayLength?: number;
  /**
   * Specifies the maximum number of characters to include when formatting.
   * Set to null or Infinity to show all elements. Set to 0 or negative to show no characters.
   * Ignored when `json` is enabled, colors are disabled, and `compact` is set to true as it produces a parseable JSON output.
   * @default 10000.
   */
  maxStringLength?: number;
  /**
   * If enabled, will sort keys while formatting objects.
   * Can also be a custom sorting function.
   * Ignored when `json` is enabled, colors are disabled, and `compact` is set to true as it produces a parseable JSON output.
   * @default false
   */
  sorted?: boolean | ((a: string, b: string) => number);
  /**
   * Specifies the number of times to recurse while formatting object.
   * This is useful for inspecting large objects. To recurse up to the maximum call stack size pass Infinity or null.
   * Ignored when `json` is enabled, colors are disabled, and `compact` is set to true as it produces a parseable JSON output.
   * @default 5
   */
  depth?: number;
  /**
   * If true, object's non-enumerable symbols and properties are included in the formatted result.
   * WeakMap and WeakSet entries are also included as well as user defined prototype properties
   * @default false
   */
  showHidden?: boolean;
  /**
   * The length at which input values are split across multiple lines. Set to Infinity to format the input as a single line (in combination with "compact" set to true).
   * Default Infinity when "compact" is true, 80 otherwise.
   * Ignored when `json` is enabled, colors are disabled, and `compact` is set to true as it produces a parseable JSON output.
   */
  breakLength?: number;
}
