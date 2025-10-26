import type { VersionValue } from "./version-options.interface.js";
import { RequestMethod } from "../../enums/index.js";
import type { RouterProxyCallback } from "./callback-paramtypes.interface.js";

export interface RouteDefinition {
  path: string[];
  requestMethod: RequestMethod;
  targetCallback: RouterProxyCallback;
  methodName: string;
  version?: VersionValue;
}
