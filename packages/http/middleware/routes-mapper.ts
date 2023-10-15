import { PathsExplorer } from "../explorers/path.explorer";
import { MetadataScanner, Type, VenokContainer } from "@venok/core";
import { HttpConfig } from "../application/config";
import { RouteDefinition, RouteInfo, VERSION_NEUTRAL, VersionValue } from "../interfaces";
import { isString, isUndefined } from "@venok/core/helpers/shared.helper";
import { addLeadingSlash } from "../helpers";
import { PATH_METADATA, VERSION_METADATA } from "../constants";
import { Module } from "@venok/core/injector/module/module";
import { targetModulesByContainer } from "../router/module";
import { MODULE_PATH } from "@venok/core/constants";

export class RoutesMapper {
  private readonly pathsExplorer: PathsExplorer;

  constructor(
    private readonly container: VenokContainer,
    private readonly httpConfig: HttpConfig,
  ) {
    this.pathsExplorer = new PathsExplorer(new MetadataScanner());
  }

  public mapRouteToRouteInfo(controllerOrRoute: Type | RouteInfo | string): RouteInfo[] {
    if (isString(controllerOrRoute)) return this.getRouteInfoFromPath(controllerOrRoute);

    const routePathOrPaths = this.getRoutePath(controllerOrRoute);

    if (this.isRouteInfo(routePathOrPaths, controllerOrRoute)) return this.getRouteInfoFromObject(controllerOrRoute);

    return this.getRouteInfoFromController(controllerOrRoute, routePathOrPaths as string);
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

  private getRouteInfoFromController(controller: Type, routePath: string | string[]): RouteInfo[] {
    const controllerPaths = this.pathsExplorer.scanForPaths(Object.create(controller), controller.prototype);
    const controllerVersion = this.getVersionMetadata(controller);
    const versioningConfig = this.httpConfig.getVersioning();
    const moduleRef = this.getHostModuleOfController(controller);
    const modulePath = this.getModulePath(moduleRef?.metatype);

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

  private isRouteInfo(
    path: string | string[] | undefined,
    objectOrClass: Function | RouteInfo,
  ): objectOrClass is RouteInfo {
    return isUndefined(path);
  }

  private normalizeGlobalPath(path: string): string {
    const prefix = addLeadingSlash(path);
    return prefix === "/" ? "" : prefix;
  }

  private getRoutePath(route: Type | RouteInfo): string | undefined {
    return Reflect.getMetadata(PATH_METADATA, route);
  }

  private getHostModuleOfController(metatype: Type): Module | undefined {
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
    if (versioningConfig) return Reflect.getMetadata(VERSION_METADATA, metatype) ?? versioningConfig.defaultVersion;
  }
}
