import type { InstanceWrapper, OnModuleInit, Type, VenokParamsFactoryInterface } from "@venok/core";
import type { ExplorerSettings } from "@venok/integration";

import type { RoutePathMetadata, VersionValue } from "~/interfaces/index.js";
import type { ControllerDiscovery } from "~/helpers/discovery.helper.js";
import type { HttpMethod } from "~/enums/method.enum.js";

import { Inject, Logger, MetadataScanner, MODULE_PATH } from "@venok/core";
import { ExplorerService } from "@venok/integration";
import { pathToRegexp } from "path-to-regexp";

import { RouteDiscovery } from "~/helpers/discovery.helper.js";
import { HttpVersioningType } from "~/enums/version-type.enum.js";
import { addLeadingSlash } from "~/helpers/path.helper.js";
import { RoutePathFactory } from "~/router/path-factory.js";
import { RouteFinder } from "~/router/finder.js";
import { HttpExceptionFiltersContext } from "~/filters/context.js";
import { HttpContextCreator } from "~/http/context.js";
import { HttpConfig } from "~/http/config.js";
import { CONTROLLER_MAPPING_MESSAGE, ROUTE_MAPPED_MESSAGE, VERSIONED_CONTROLLER_MAPPING_MESSAGE, VERSIONED_ROUTE_MAPPED_MESSAGE } from "~/helpers/messages.helper.js";
import { CONTROLLER_METADATA } from "~/constants.js";

export class HttpExplorerService extends ExplorerService<ControllerDiscovery> implements OnModuleInit {
  /* Abstract */
  protected override paramsFactory!: VenokParamsFactoryInterface;

  /*  */
  @Inject(HttpConfig)
  private readonly httpConfig!: HttpConfig;
  private pathFactory!: RoutePathFactory;
  private readonly logger = new Logger(HttpExplorerService.name, { timestamp: true });

  private routeFinder: RouteFinder = new RouteFinder(new MetadataScanner());

  public onModuleInit() {
    this.pathFactory = new RoutePathFactory(this.httpConfig);
    this.paramsFactory = this.httpConfig.getHttpAdapterRef().getParamsFactory();
  }

  protected getSettings(): ExplorerSettings {
    return {
      contextType: "http",
      isRequestScopeSupported: true,
      exceptionsFilterClass: HttpExceptionFiltersContext,
      contextCreatorClass: HttpContextCreator,
      options: { guards: true, interceptors: true, filters: false },
    };
  }

  protected filterProperties(wrapper: InstanceWrapper, metadataKey: string) {
    if (!wrapper.metatype) return;

    if (this.get<boolean>(metadataKey, wrapper.metatype)) return;

    const controllerDiscovery = this.get<ControllerDiscovery>(CONTROLLER_METADATA, wrapper.metatype);
    if (!controllerDiscovery) return;

    const info = this.routeFinder.getControllerInfo(controllerDiscovery, this.httpConfig);
    const name = wrapper.metatype.name;
    const globalPrefix = addLeadingSlash(this.httpConfig.getGlobalPrefix());
    const modulePath = this.getModulePathMetadata(wrapper.metatype as Type);

    controllerDiscovery.setDiscovery({ class: wrapper.instance.constructor });

    info.prefixes.forEach((controllerPath) => {
      this.logController(controllerPath, info.version, name, globalPrefix, modulePath);

      const routes = this.routeFinder.getControllerRoutes(wrapper.instance as object);

      routes.forEach(route => {
        const callback: Function = this.createCallback(wrapper, route.methodName);
        const isVersioned = !!((route.version || info.version) && info.versioningOptions);

        route.paths.map((methodPath) => {
          const metadata: RoutePathMetadata = {
            modulePath,
            globalPrefix,
            methodPath,
            controllerPath: controllerPath,
            methodVersion: route.version as VersionValue,
            controllerVersion: info.version as VersionValue,
            versioningOptions: info.versioningOptions,
          };

          this.pathFactory
            .create(metadata, route.requestMethod)
            .forEach((path) => {
              let parsedHosts = undefined;

              if (info.host) {
                const hosts = Array.isArray(info.host) ? info.host : [info.host];
                parsedHosts = hosts.map((host: string | RegExp) => {
                  const keys: any[] = [];
                  const regexp = pathToRegexp(host, keys);
                  return { regexp, keys };
                });
              }

              const routeDiscovery = new RouteDiscovery({
                path,
                method: route.requestMethod,
                useVersionFilter: isVersioned && info.versioningOptions!.type !== HttpVersioningType.URI,
                hosts: parsedHosts,
                versioningOptions: info.versioningOptions,
                useHostFilter: !!info.host,
                handlers: [
                  {
                    handler: callback,
                    version: this.pathFactory.getVersion(metadata) as VersionValue,
                  },
                ],
              });
              routeDiscovery.setDiscovery({ class: wrapper.instance.constructor, handler: wrapper.instance[route.methodName] });
              controllerDiscovery.pushItem(routeDiscovery);
            });

          this.logRoute(metadata, route.requestMethod, isVersioned);
        });
      });
    });

    return controllerDiscovery;
  }

  /* Internal methods */
  private getModulePathMetadata(metatype: Type): string | undefined {
    const modulesContainer = this.container.getModules();
    const modulePath = Reflect.getMetadata(MODULE_PATH + modulesContainer.applicationId, metatype);
    return modulePath ?? Reflect.getMetadata(MODULE_PATH, metatype);
  }

  private logController(
    path: string,
    version: VersionValue | undefined,
    name: string, globalPrefix: string,
    modulePath: string | undefined
  ) {
    this.pathFactory
      .create({ controllerPath: path, globalPrefix, modulePath })
      .forEach((controllerPath) => {
        const message = !version
          ? CONTROLLER_MAPPING_MESSAGE(name, controllerPath)
          : VERSIONED_CONTROLLER_MAPPING_MESSAGE(name, controllerPath, version);

        this.logger.log(message);
      });
  }

  private logRoute(metadata: RoutePathMetadata, method: HttpMethod, isVersioned: boolean) {
    const pathsToLog = this.pathFactory.create({ ...metadata, versioningOptions: undefined }, method);

    pathsToLog.forEach((routePath) => {
      const message = isVersioned
        ? VERSIONED_ROUTE_MAPPED_MESSAGE(
            routePath,
            method,
            this.pathFactory.getVersion(metadata) as VersionValue
          )
        : ROUTE_MAPPED_MESSAGE(routePath, method);

      this.logger.log(message);
    });
  }
}