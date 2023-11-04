import { RequestMethod } from "../enums";
import { VERSION_NEUTRAL, VersionValue } from "../interfaces/router/version-options.interface";

export const ROUTE_MAPPED_MESSAGE = (path: string, method: string | number) =>
  `Mapped {${path}, ${RequestMethod[method as any]}} route`;

export const VERSIONED_ROUTE_MAPPED_MESSAGE = (path: string, method: string | number, version: VersionValue) => {
  const controllerVersions = Array.isArray(version) ? version : [version];
  const versions = controllerVersions.map((version) => (version === VERSION_NEUTRAL ? "Neutral" : version)).join(",");

  return `Mapped {${path}, ${RequestMethod[method as any]}} (version: ${versions}) route`;
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
