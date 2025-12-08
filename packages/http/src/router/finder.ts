import type { VersioningOptions, VersionValue } from "~/interfaces/router/version.interface.js";
import type { ControllerDiscovery } from "~/helpers/discovery.helper.js";
import type { RouteDefinition } from "~/interfaces/index.js";
import type { HttpMethod } from "~/enums/method.enum.js";
import type { HttpConfig } from "~/http/config.js";

import { isString, isUndefined, MetadataScanner } from "@venok/core";

import { METHOD_METADATA, PATH_METADATA, VERSION_METADATA } from "~/constants.js";
import { addLeadingSlash } from "~/helpers/path.helper.js";

export class RouteFinder {
  public constructor(private readonly metadataScanner: MetadataScanner) {}

  public getControllerInfo(discovery: ControllerDiscovery, httpConfig: HttpConfig): {
    version: VersionValue | undefined,
    host: string | RegExp | (string | RegExp)[] | undefined,
    prefixes: string[],
    versioningOptions: VersioningOptions | undefined
  } {
    const version = discovery.getVersion() ?? httpConfig.getVersioning()?.defaultVersion;
    const host = discovery.getHost();
    const prefixes = this.extractControllerPrefixes(discovery.getPrefixes());
    const versioningOptions = httpConfig.getVersioning();

    return { version, host, prefixes, versioningOptions };
  }

  private extractControllerPrefixes(prefixes: string | string[]): string[] {
    if (isUndefined(prefixes)) return [];
    if (Array.isArray(prefixes)) return prefixes.map((prefix) => addLeadingSlash(prefix));
    return [addLeadingSlash(prefixes)];
  }

  public getControllerRoutes(instance: object, prototype?: object) {
    const instancePrototype: object = isUndefined(prototype) ? Object.getPrototypeOf(instance) : prototype;

    return this.metadataScanner.getAllMethodNames(instancePrototype).reduce((acc: RouteDefinition[], method) => {
      const route = this.exploreMethod(instance, instancePrototype, method);
      if (route) acc.push(route);
      return acc;
    }, []);
  }

  private exploreMethod<T extends Record<string | symbol, any>>(
    instance: T,
    prototype: T,
    methodName: string
  ): RouteDefinition | null {
    const targetCallback: any = instance[methodName];
    const prototypeCallback: object = prototype[methodName];

    const routePath = Reflect.getMetadata(PATH_METADATA, prototypeCallback);
    if (isUndefined(routePath)) return null;

    const requestMethod: HttpMethod = Reflect.getMetadata(METHOD_METADATA, prototypeCallback);
    const version: VersionValue | undefined = Reflect.getMetadata(VERSION_METADATA, prototypeCallback);
    const paths = isString(routePath) ? [addLeadingSlash(routePath)] : routePath.map((p: string) => addLeadingSlash(p));

    return { paths, requestMethod, targetCallback, methodName, version };
  }
}