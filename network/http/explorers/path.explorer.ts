import { MetadataScanner } from "@venok/core";
import { RouteDefinition, VersionValue } from "../interfaces";
import { isString, isUndefined } from "@venok/core/helpers/shared.helper";
import { METHOD_METADATA, PATH_METADATA, VERSION_METADATA } from "../constants";
import { RequestMethod } from "../enums";
import { addLeadingSlash } from "../helpers";

export class PathsExplorer {
  constructor(private readonly metadataScanner: MetadataScanner) {}

  public scanForPaths(instance: Object, prototype?: object): RouteDefinition[] {
    const instancePrototype = isUndefined(prototype) ? Object.getPrototypeOf(instance) : prototype;

    return this.metadataScanner.getAllMethodNames(instancePrototype).reduce((acc: RouteDefinition[], method) => {
      const route = this.exploreMethodMetadata(instance, instancePrototype, method);

      if (route) acc.push(route);

      return acc;
    }, []);
  }

  public exploreMethodMetadata<T extends Record<string | symbol, any>>(
    instance: T,
    prototype: T,
    methodName: string,
  ): RouteDefinition | null {
    const instanceCallback = instance[methodName];
    const prototypeCallback = prototype[methodName];

    const routePath = Reflect.getMetadata(PATH_METADATA, prototypeCallback);
    if (isUndefined(routePath)) return null;

    const requestMethod: RequestMethod = Reflect.getMetadata(METHOD_METADATA, prototypeCallback);
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
