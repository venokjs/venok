import type { Type } from "@venok/core";

import type { RouteDefinition, RouteInfo, VersionValue } from "~/interfaces/index.js";
import type { ControllerDiscovery } from "~/discovery/controller.discovery.js";

import { CoreModule, isString, MetadataScanner, MODULE_PATH, Reflector, VenokContainer } from "@venok/core";

import { VERSION_NEUTRAL } from "~/interfaces/index.js";
import { HttpConfig } from "~/application/config.js";
import { Controller } from "~/decorators/controller.decorator.js";
import { PathsExplorer } from "~/explorers/path.explorer.js";
import { addLeadingSlash } from "~/helpers/path.helper.js";
import { targetModulesByContainer } from "~/router/module.js";

export class RoutesMapper {
  private readonly pathsExplorer: PathsExplorer;

  constructor(
    private readonly container: VenokContainer,
    private readonly httpConfig: HttpConfig
  ) {
    this.pathsExplorer = new PathsExplorer(new MetadataScanner());
  }

  public mapRouteToRouteInfo(controllerOrRoute: Type | RouteInfo | string): RouteInfo[] {
    if (isString(controllerOrRoute)) return this.getRouteInfoFromPath(controllerOrRoute);

    return this.isRouteInfo(controllerOrRoute)
      ? this.getRouteInfoFromObject(controllerOrRoute)
      : this.getRouteInfoFromController(controllerOrRoute);
  }

  private isRouteInfo(controllerOrRoute: Type | RouteInfo): controllerOrRoute is RouteInfo {
    return "path" in controllerOrRoute;
  }

  private getRouteInfoFromPath(routePath: string): RouteInfo[] {
    const defaultRequestMethod = -1;
    return [
      {
        path: addLeadingSlash(routePath),
        method: defaultRequestMethod as any,
      },
    ];
  }

  private getRouteInfoFromObject(routeInfoObject: RouteInfo): RouteInfo[] {
    const routeInfo: RouteInfo = {
      path: addLeadingSlash(routeInfoObject.path),
      method: routeInfoObject.method,
    };

    if (routeInfoObject.version) routeInfo.version = routeInfoObject.version;

    return [routeInfo];
  }

  private getRouteInfoFromController(controller: Type): RouteInfo[] {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const controllerPaths = this.pathsExplorer.scanForPaths(Object.create(controller), controller.prototype);
    const controllerVersion = this.getVersionMetadata(controller);
    const versioningConfig = this.httpConfig.getVersioning();
    const moduleRef = this.getHostModuleOfController(controller);
    const modulePath = this.getModulePath(moduleRef?.metatype);
    const routePath = this.getRoutePath(controller);

    const concatPaths = <T>(acc: T[], currentValue: T[]) => acc.concat(currentValue);

    const toUndefinedIfNeural = (version: VersionValue) => (version === VERSION_NEUTRAL ? undefined : version);

    const toRouteInfo = (item: RouteDefinition, prefix: string) =>
      item.path
        ?.map((p) => {
          let endpointPath = modulePath ?? "";
          endpointPath += this.normalizeGlobalPath(prefix) + addLeadingSlash(p);

          const routeInfo: RouteInfo = {
            path: endpointPath,
            method: item.requestMethod,
          };

          const version = item.version ?? controllerVersion;
          if (version && versioningConfig) {
            if (typeof version !== "string" && Array.isArray(version)) {
              return version.map((v) => ({
                ...routeInfo,
                version: toUndefinedIfNeural(v),
              }));
            }
            routeInfo.version = toUndefinedIfNeural(version);
          }

          return routeInfo;
        })
        .flat() as RouteInfo[];

    const mapped = Array.isArray(routePath) ? routePath : [routePath];

    return mapped
      .map((path) => controllerPaths.map((item) => toRouteInfo(item, path)).reduce(concatPaths, []))
      .reduce(concatPaths, []);
  }

  private normalizeGlobalPath(path: string): string {
    const prefix = addLeadingSlash(path);
    return prefix === "/" ? "" : prefix;
  }

  private getRoutePath(route: Type | RouteInfo): string | string[] {
    const discovery = Reflector.reflector.get<ControllerDiscovery>(Controller, route as Type);
    return discovery.getPath();
  }

  private getHostModuleOfController(metatype: Type): CoreModule | undefined {
    if (!metatype) return;

    const modulesContainer = this.container.getModules();
    const moduleRefsSet = targetModulesByContainer.get(modulesContainer);
    if (!moduleRefsSet) return;

    const modules = Array.from(modulesContainer.values()).filter((moduleRef) => moduleRefsSet.has(moduleRef));

    return modules.find(({ injectables }) => injectables.has(metatype));
  }

  private getModulePath(metatype: Type | undefined): string | undefined {
    if (!metatype) return;

    const modulesContainer = this.container.getModules();
    const modulePath = Reflect.getMetadata(MODULE_PATH + modulesContainer.applicationId, metatype);
    return modulePath ?? Reflect.getMetadata(MODULE_PATH, metatype);
  }

  private getVersionMetadata(metatype: Type | Function): VersionValue | undefined {
    const versioningConfig = this.httpConfig.getVersioning();
    if (!versioningConfig) return undefined;

    const discovery = Reflector.reflector.get<ControllerDiscovery>(Controller, metatype);

    return (discovery.getVersion() as VersionValue) ?? versioningConfig.defaultVersion;
  }
}
