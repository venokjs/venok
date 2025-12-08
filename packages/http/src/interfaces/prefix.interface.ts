import type { RouteInfo } from "~/interfaces/router/index.js";

export interface GlobalPrefixOptions<T = string | RouteInfo> {
  exclude?: T[];
}
