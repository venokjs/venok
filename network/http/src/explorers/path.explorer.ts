import type { RouteDefinition, VersionValue } from "~/interfaces/index.js";

import { isString, isUndefined, MetadataScanner } from "@venok/core";

import { METHOD_METADATA, PATH_METADATA, VERSION_METADATA } from "~/constants.js";
import { RequestMethod } from "~/enums/request-method.enum.js";
import { addLeadingSlash } from "~/helpers/path.helper.js";

export class PathsExplorer {
  constructor(private readonly metadataScanner: MetadataScanner) {}

  public scanForPaths(instance: object, prototype?: object): RouteDefinition[] {
    const instancePrototype = isUndefined(prototype) ? Object.getPrototypeOf(instance) : prototype;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.metadataScanner.getAllMethodNames(instancePrototype).reduce((acc: RouteDefinition[], method) => {
      const route = this.exploreMethodMetadata(instance, instancePrototype, method);

      if (route) acc.push(route);

      return acc;
    }, []);
  }

  public exploreMethodMetadata<T extends Record<string | symbol, any>>(
    instance: T,
    prototype: T,
    methodName: string
  ): RouteDefinition | null {
    const instanceCallback = instance[methodName];
    const prototypeCallback = prototype[methodName];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const routePath = Reflect.getMetadata(PATH_METADATA, prototypeCallback);
    if (isUndefined(routePath)) return null;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const requestMethod: RequestMethod = Reflect.getMetadata(METHOD_METADATA, prototypeCallback);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const version: VersionValue | undefined = Reflect.getMetadata(VERSION_METADATA, prototypeCallback);
    const path = isString(routePath) ? [addLeadingSlash(routePath)] : routePath.map((p: string) => addLeadingSlash(p));

    return {
      path,
      requestMethod,
      targetCallback: instanceCallback,
      methodName,
      version,
    };
  }
}
