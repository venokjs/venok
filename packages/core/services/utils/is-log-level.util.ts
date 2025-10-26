import { LOG_LEVELS, type LogLevel } from "../logger.service.js";

/**
 * @publicApi
 */
export function isLogLevel(maybeLogLevel: any): maybeLogLevel is LogLevel {
  return LOG_LEVELS.includes(maybeLogLevel);
}
