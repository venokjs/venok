import { Logger } from "@venok/core/services/logger.service.js";
import { noop } from "@venok/core/helpers/noop.helper.js";

export class SilentLogger extends Logger {
  log = noop;
  error = noop;
  warn = noop;
  debug = noop;
  verbose = noop;
  fatal = noop;
  setLogLevels = noop;
}
