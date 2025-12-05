import type { VersionValue } from "~/interfaces/index.js";
import type { HttpMethod } from "~/enums/method.enum.js";

export type RouteDefinition = {
  paths: string[];
  requestMethod: HttpMethod;
  targetCallback: (...args: any[]) => void;
  methodName: string;
  version?: VersionValue;
};
