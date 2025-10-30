import type { Type } from "@venok/core";
import type { RequestMethod } from "~/enums/request-method.enum.js";
import type { VersionValue } from "~/interfaces/index.js";

export interface RouteInfo {
  path: string;
  method: RequestMethod;
  version?: VersionValue;
}

export interface MiddlewareConfiguration<T = any> {
  middleware: T;
  to: (Type | string | RouteInfo)[];
}
