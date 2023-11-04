import { Type } from "@venok/core";

export interface RouteTree {
  path: string;
  module?: Type;
  children?: Routes | Type[];
}

export type Routes = RouteTree[];
