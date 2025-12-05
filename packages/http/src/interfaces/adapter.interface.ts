import type { VersioningOptions, VersionValue } from "./router/version.interface.js";
import type { RouteInfo } from "~/interfaces/router/index.js";
import type { HttpMethod } from "~/enums/method.enum.js";

export type AdapterRouteMetadata = {
  useVersionFilter: boolean,
  useHostFilter: boolean,
  method: HttpMethod,
  versioningOptions?: VersioningOptions,
  hosts?: { regexp: RegExp, keys: any[] }[]
  handlers: {
    version?: VersionValue,
    handler: Function,
  }[]
};

export type AdapterPathMiddlewareMetadata = {
  use: Function,
  method: HttpMethod
  excludedPaths?: Exclude<RouteInfo, "version">[]
};

export type AdapterInstanceRouteMetadata = {
  handler: ((...args: any[]) => Promise<void>),
  method: HttpMethod
};

export type AdapterMiddlewareMetadata = { path: string, handlers: AdapterPathMiddlewareMetadata[] };