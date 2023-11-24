import { Type } from "@venok/core";

export interface BaseMiddlewareConfiguration<MiddlewareType = any, ToType = any> {
  middleware: MiddlewareType;
  to: (string | Type | ToType)[];
}
