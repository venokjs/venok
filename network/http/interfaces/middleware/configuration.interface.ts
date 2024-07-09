import { Type } from "@venok/core";
import { RequestMethod } from "@venok/http/enums";
import { VersionValue } from "@venok/http/interfaces";

export interface RouteInfo {
  path: string;
  method: RequestMethod;
  version?: VersionValue;
}

export interface MiddlewareConfiguration<T = any> {
  middleware: T;
  to: (Type | string | RouteInfo)[];
}
