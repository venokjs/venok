import type { LogLevel } from "~/interfaces/index.js";

import { LOG_LEVELS } from "~/services/logger.service.js";

/**
 * @publicApi
 */
export function isLogLevel(maybeLogLevel: any): maybeLogLevel is LogLevel {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  return LOG_LEVELS.includes(maybeLogLevel);
}
