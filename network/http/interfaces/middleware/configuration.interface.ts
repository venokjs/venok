import type { Type } from "@venok/core";
import { RequestMethod } from "@venok/http/enums/index.js";
import type { VersionValue } from "@venok/http/interfaces/index.js";

export interface RouteInfo {
  path: string;
  method: RequestMethod;
  version?: VersionValue;
}

export interface MiddlewareConfiguration<T = any> {
  middleware: T;
  to: (Type | string | RouteInfo)[];
}
