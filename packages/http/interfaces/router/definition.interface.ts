import { VersionValue } from "./version-options.interface";
import { RequestMethod } from "../../enums";
import { RouterProxyCallback } from "./callback-paramtypes.interface";

export interface RouteDefinition {
  path: string[];
  requestMethod: RequestMethod;
  targetCallback: RouterProxyCallback;
  methodName: string;
  version?: VersionValue;
}
