import { RequestMethod } from "../../enums";
import { VersionValue } from "../router/version-options.interface";
import { Type } from "@venok/core";

export interface RouteInfo {
  path: string;
  method: RequestMethod;
  version?: VersionValue;
}

export interface MiddlewareConfiguration<T = any> {
  middleware: T;
  forRoutes: (Type<any> | string | RouteInfo)[];
}
