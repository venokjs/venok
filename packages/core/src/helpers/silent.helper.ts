import { noop } from "~/helpers/noop.helper.js";
import { Logger } from "~/services/logger.service.js";

export class SilentLogger extends Logger {
  log = noop;
  error = noop;
  warn = noop;
  debug = noop;
  verbose = noop;
  fatal = noop;
  setLogLevels = noop;
}
