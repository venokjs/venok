import type { OnModuleInit, Type } from "@venok/core";

import type { HttpServer, RoutePathMetadata, VersionValue } from "~/interfaces/index.js";

import { Inject, Injectable, InstanceWrapper, Logger } from "@venok/core";
import { ExplorerService } from "@venok/integration";
import { VenokContextCreator } from "@venok/core/";
import { MODULE_PATH } from "@venok/core/constants.js";
import { pathToRegexp } from "path-to-regexp";

import { RouteDiscovery } from "~/discovery/route.discovery.js";
import { RouterExceptionFiltersContext } from "~/filters/context.js";
import { ControllerDiscovery } from "~/discovery/controller.discovery.js";
import { PathsExplorer } from "~/explorers/path.explorer.js";
import { VersioningType } from "~/enums/version-type.enum.js";
import { InternalServerErrorException } from "~/errors/internal-server-error.exception.js";
import { HttpConfig } from "~/application/config.js";
import { HttpContextCreator } from "~/context/context.js";
import { RouteParamsFactory } from "~/factory/params.factory.js";
import { RoutePathFactory } from "~/factory/path.factory.js";
import { addLeadingSlash } from "~/helpers/path.helper.js";
import { CONTROLLER_MAPPING_MESSAGE, ROUTE_MAPPED_MESSAGE, VERSIONED_CONTROLLER_MAPPING_MESSAGE, VERSIONED_ROUTE_MAPPED_MESSAGE } from "~/helpers/messages.helper.js";

@Injectable()
export class RoutesExplorer extends ExplorerService<ControllerDiscovery> implements OnModuleInit {
  @Inject(HttpConfig)
  private readonly httpConfig!: HttpConfig;

  private readonly logger = new Logger(RoutesExplorer.name, {
    timestamp: true,
  });

  protected readonly type = "http";
  protected readonly withRequestScope = true;
  protected readonly options = { guards: true, filters: false, interceptors: true };

  private readonly pathsExplorer = new PathsExplorer(this.metadataScanner);

  protected paramsFactory = new RouteParamsFactory();

  private pathFactory!: RoutePathFactory;
  protected override exceptionsFilter!: RouterExceptionFiltersContext;
  protected override contextCreator!: VenokContextCreator;

  public onModuleInit(): any {
    console.log("INIT MODULE");
    this.pathFactory = new RoutePathFactory(this.httpConfig);
    this.exceptionsFilter = new RouterExceptionFiltersContext(this.container, this.container.applicationConfig);
    this.contextCreator = HttpContextCreator.fromContainer(
      this.container,
      HttpContextCreator,
      RouterExceptionFiltersContext
    );
  }

  protected filterProperties(
    wrapper: InstanceWrapper,
    metadataKey: string
  ): NonNullable<ControllerDiscovery> | undefined {
    const { instance } = wrapper;

    if (!wrapper.metatype) return;

    const controllerDiscovery = this.get<ControllerDiscovery>(metadataKey, wrapper.metatype);

    if (!controllerDiscovery) return;

    const controllerVersion = controllerDiscovery.getVersion() ?? this.httpConfig.getVersioning()?.defaultVersion;
    const host = controllerDiscovery.getHost();
    const controllerPaths = this.pathFactory.extractControllerPath(controllerDiscovery.getPath());
    const versioningOptions = this.httpConfig.getVersioning();
    const name = wrapper.metatype.name;

    const globalPrefix = addLeadingSlash(this.httpConfig.getGlobalPrefix());
    const modulePath = this.getModulePathMetadata(wrapper.metatype as Type);

    controllerDiscovery.setDiscovery({ class: instance.constructor });

    controllerPaths.forEach((controllerPath) => {
      const log = this.pathFactory.create({
        ctrlPath: controllerPath,
        globalPrefix,
        modulePath,
      });

      log.forEach((controllerPath) => {
        const message = !controllerVersion
          ? CONTROLLER_MAPPING_MESSAGE(name, controllerPath)
          : VERSIONED_CONTROLLER_MAPPING_MESSAGE(name, controllerPath, controllerVersion);

        this.logger.log(message);
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const routes = this.pathsExplorer.scanForPaths(instance);

      return routes.forEach((route) => {
        const { path: paths, requestMethod, methodName, version } = route;
        const callback = this.createCallback(wrapper, methodName);
        const isVersioned = !!((version || controllerVersion) && versioningOptions);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        let handler = this.applyHostFilter(host, callback);

        paths.map((methodPath) => {
          const metadata: RoutePathMetadata = {
            modulePath,
            globalPrefix,
            methodPath,
            ctrlPath: controllerPath,
            methodVersion: version as VersionValue,
            controllerVersion: controllerVersion as VersionValue,
            versioningOptions,
          };

          if (isVersioned && versioningOptions.type !== VersioningType.URI) {
            // All versioning (except for URI Versioning) is done via the "Version Filter"
            handler = this.applyVersionFilter(metadata, handler);
          }

          const pathsToRegister = this.pathFactory.create(metadata, requestMethod);

          pathsToRegister.forEach((path) => {
            const routeDiscovery = new RouteDiscovery({ path, method: requestMethod });
            routeDiscovery.setDiscovery({ class: instance.constructor, handler: instance[methodName] });
            routeDiscovery.setContextCallback(handler);
            controllerDiscovery.setItem(routeDiscovery);
          });

          const pathsToLog = this.pathFactory.create({ ...metadata, versioningOptions: undefined }, requestMethod);

          pathsToLog.forEach((routePath) => {
            const message = isVersioned
              ? VERSIONED_ROUTE_MAPPED_MESSAGE(
                  routePath,
                  requestMethod,
                  this.pathFactory.getVersion(metadata) as VersionValue
                )
              : ROUTE_MAPPED_MESSAGE(routePath, requestMethod);

            this.logger.log(message);
          });
        });
      });
    });

    return controllerDiscovery;
  }

  private getModulePathMetadata(metatype: Type): string | undefined {
    const modulesContainer = this.container.getModules();
    const modulePath = Reflect.getMetadata(MODULE_PATH + modulesContainer.applicationId, metatype);
    return modulePath ?? Reflect.getMetadata(MODULE_PATH, metatype);
  }

  private applyHostFilter(host: string | RegExp | Array<string | RegExp> | undefined, handler: Function) {
    if (!host) return handler;

    const hosts = Array.isArray(host) ? host : [host];
    const hostRegExps = hosts.map((host: string | RegExp) => {
      const keys: any[] = [];
      const regexp = pathToRegexp(host, keys);
      return { regexp, keys };
    });

    const unsupportedFilteringErrorMessage = Array.isArray(host)
      ? `HTTP adapter does not support filtering on hosts: ["${host.join('", "')}"]`
      : `HTTP adapter does not support filtering on host: "${host}"`;

    return <TRequest extends Record<string, any> = any, TResponse = any>(
      req: TRequest,
      res: TResponse,
      next: () => void
    ) => {
      (req as Record<string, any>).hosts = {};
      const hostname = this.httpConfig.getHttpAdapterRef().getRequestHostname(req) || "";

      for (const exp of hostRegExps) {
        const match = hostname.match(exp.regexp);
        if (match) {
          if (exp.keys.length > 0) {
            exp.keys.forEach((key, i) => (req.hosts[key.name] = match[i + 1]));
          } else if (exp.regexp && match.groups) {
            for (const groupName in match.groups) req.hosts[groupName] = match.groups[groupName];
          }
          return handler(req, res, next);
        }
      }
      if (!next) throw new InternalServerErrorException(unsupportedFilteringErrorMessage);

      return next();
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private applyVersionFilter<T extends HttpServer>(routePathMetadata: RoutePathMetadata, handler: Function) {
    const version = this.pathFactory.getVersion(routePathMetadata) as VersionValue;
    return this.httpConfig
      .getHttpAdapterRef()
      // @ts-expect-error Mismatch types
      .applyVersionFilter(handler, version, routePathMetadata.versioningOptions);
  }
}
