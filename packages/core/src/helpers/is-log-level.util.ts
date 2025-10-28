import { LOG_LEVELS } from "~/services/logger.service.js";
import type { LogLevel } from "~/interfaces/index.js";

/**
 * @publicApi
 */
export function isLogLevel(maybeLogLevel: any): maybeLogLevel is LogLevel {
  return LOG_LEVELS.includes(maybeLogLevel);
}
