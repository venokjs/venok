import type { VersionValue } from "~/interfaces/index.js";
import type { HttpMethod } from "~/enums/method.enum.js";

export interface RouteInfo {
  path: string;
  method: HttpMethod;
  version?: VersionValue;
}
