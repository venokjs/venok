import type { Type, VenokContainer } from "@venok/core";

import type { RouteInfo, RoutePathMetadata, VersionValue } from "~/interfaces/index.js";
import type { ControllerDiscovery } from "~/helpers/discovery.helper.js";
import type { HttpConfig } from "~/http/config.js";

import { CoreModule, isString, MetadataScanner, MODULE_PATH, Reflector } from "@venok/core";

import { RoutePathFactory } from "~/router/path-factory.js";
import { RouteFinder } from "~/router/finder.js";
import { addLeadingSlash } from "~/helpers/path.helper.js";
import { Controller } from "~/decorators/controller.decorator.js";
import { targetModulesByContainer } from "~/router/module.js";
import { HttpMethod } from "~/enums/method.enum.js";


export class MiddlewareRoutesMapper {
  private readonly routeFinder: RouteFinder;
  private readonly routePathFactory: RoutePathFactory;

  constructor(
    private readonly container: VenokContainer,
    private readonly httpConfig: HttpConfig
  ) {
    this.routeFinder = new RouteFinder(new MetadataScanner());
    this.routePathFactory = new RoutePathFactory(this.httpConfig);
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
    const globalPrefix = addLeadingSlash(this.httpConfig.getGlobalPrefix());

    /* We can use only first because we don't have versioning, only path and global prefix */
    const path = this.routePathFactory.create({ methodPath: routePath, globalPrefix })[0];
    
    return [{ path: path, method: HttpMethod.ALL }];
  }

  private getRouteInfoFromObject(routeInfoObject: RouteInfo): RouteInfo[] {
    const globalPrefix = addLeadingSlash(this.httpConfig.getGlobalPrefix());
    
    const paths = this.routePathFactory.create({ 
      methodPath: routeInfoObject.path, 
      globalPrefix, 
      versioningOptions: this.httpConfig.getVersioning(), 
      methodVersion: routeInfoObject.version, 
    });
    
    /* We should use all paths from factory because route info could contain multiple versions */
    return paths.map(path => ({ path, method: routeInfoObject.method }));
  }

  private getRouteInfoFromController(controller: Type): RouteInfo[] {
    const discovery = Reflector.reflector.get<ControllerDiscovery>(Controller, controller);
    
    const info = this.routeFinder.getControllerInfo(discovery, this.httpConfig);
    const globalPrefix = addLeadingSlash(this.httpConfig.getGlobalPrefix());
    const moduleRef = this.getHostModuleOfController(controller);
    const modulePath = this.getModulePath(moduleRef?.metatype as Type);
    const routes = this.routeFinder.getControllerRoutes(Object.create(controller) as object, controller.prototype as object);

    const output: RouteInfo[] = [];

    info.prefixes.forEach((controllerPath) => {
      routes.forEach(route => {
        route.paths.forEach((methodPath) => {
          const metadata: RoutePathMetadata = {
            modulePath,
            globalPrefix,
            methodPath,
            controllerPath: controllerPath,
            methodVersion: route.version as VersionValue,
            controllerVersion: info.version as VersionValue,
            versioningOptions: info.versioningOptions,
          };

          const routeInfos = this.routePathFactory
            .create(metadata, route.requestMethod)
            .map(endpoint => ({ path: endpoint, method: route.requestMethod }));

          output.push(...routeInfos);
        });
      });
    });

    return output;
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
}
