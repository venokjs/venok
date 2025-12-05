import type { VersionValue } from "~/interfaces/index.js";

import { VERSION_NEUTRAL } from "~/interfaces/index.js";
import { HttpMethod } from "~/enums/method.enum.js";


export const ROUTE_MAPPED_MESSAGE = (path: string, method: string | number) =>
  `Mapped {${path}, ${HttpMethod[method as any]}} route`;

export const VERSIONED_ROUTE_MAPPED_MESSAGE = (path: string, method: string | number, version: VersionValue) => {
  const controllerVersions = Array.isArray(version) ? version : [version];
  const versions = controllerVersions.map((version) => (version === VERSION_NEUTRAL ? "Neutral" : version)).join(",");

  return `Mapped {${path}, ${HttpMethod[method as any]}} (version: ${versions}) route`;
};

export const CONTROLLER_MAPPING_MESSAGE = (name: string, path: string) => `${name} {${path}}:`;

export const VERSIONED_CONTROLLER_MAPPING_MESSAGE = (name: string, path: string, version: VersionValue) => {
  const controllerVersions = Array.isArray(version) ? version : [version];
  const versions = controllerVersions.map((version) => (version === VERSION_NEUTRAL ? "Neutral" : version)).join(",");

  return `${name} {${path}} (version: ${versions}):`;
};

export const VENOK_HTTP_SERVER_START = (port: string | number) => {
  return `Venok start Http server on port: ${port}`;
};