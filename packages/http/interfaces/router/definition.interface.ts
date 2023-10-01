import { RequestMethod } from "../../enums";
import { RouterProxyCallback } from "../../exceptions/proxy";
import { VersionValue } from "./version-options.interface";

export interface RouteDefinition {
  path: string[];
  requestMethod: RequestMethod;
  targetCallback: RouterProxyCallback;
  methodName: string;
  version?: VersionValue;
}
