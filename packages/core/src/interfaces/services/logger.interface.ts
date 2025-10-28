import type { LOG_LEVELS } from "~/services/logger.service.js";

/**
 * @publicApi
 */
export type LogLevel = (typeof LOG_LEVELS)[number];

/**
 * @publicApi
 */
export interface LoggerService {
  /**
   * Write a 'log' level log.
   */
  log(message: any, ...optionalParams: any[]): any;

  /**
   * Write an 'error' level log.
   */
  error(message: any, ...optionalParams: any[]): any;

  /**
   * Write a 'warn' level log.
   */
  warn(message: any, ...optionalParams: any[]): any;

  /**
   * Write a 'debug' level log.
   */
  debug?(message: any, ...optionalParams: any[]): any;

  /**
   * Write a 'verbose' level log.
   */
  verbose?(message: any, ...optionalParams: any[]): any;

  /**
   * Write a 'fatal' level log.
   */
  fatal?(message: any, ...optionalParams: any[]): any;

  /**
   * Set log levels.
   * @param levels log levels
   */
  setLogLevels?(levels: LogLevel[]): any;
}
