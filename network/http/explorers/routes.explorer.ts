import { Inject, Injectable, Type } from "@venok/core";
import { ExplorerService } from "@venok/integration/services/explorer.service";
import { RouteDiscovery } from "@venok/http/discovery/route.discovery";
import { VenokContextCreator } from "@venok/core/context";
import { RouteParamsFactory, RoutePathFactory } from "@venok/http/factory";
import { RouterExceptionFiltersContext } from "@venok/http/filters/context";
import { InstanceWrapper } from "@venok/core/injector/instance/wrapper";
import { ControllerDiscovery } from "@venok/http/discovery/controller.discovery";
import {
  addLeadingSlash,
  CONTROLLER_MAPPING_MESSAGE,
  ROUTE_MAPPED_MESSAGE,
  VERSIONED_CONTROLLER_MAPPING_MESSAGE,
  VERSIONED_ROUTE_MAPPED_MESSAGE,
} from "@venok/http/helpers";
import { MODULE_PATH } from "@venok/core/constants";
import { HttpServer, RoutePathMetadata, VersionValue } from "@venok/http/interfaces";
import { PathsExplorer } from "@venok/http/explorers/path.explorer";
import { VersioningType } from "@venok/http/enums";
import { pathToRegexp } from "path-to-regexp";
import { InternalServerErrorException } from "@venok/http/errors";
import { Logger } from "@venok/core/services/logger.service";
import { HttpConfig } from "@venok/http/application/config";
import { OnModuleInit } from "@venok/core";
import { HttpContextCreator } from "@venok/http/context/context";

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
      RouterExceptionFiltersContext,
    );
  }

  protected filterProperties(
    wrapper: InstanceWrapper,
    metadataKey: string,
  ): NonNullable<ControllerDiscovery> | undefined {
    const { instance } = wrapper;

    if (!wrapper.metatype) return;

    const controllerDiscovery = this.get<ControllerDiscovery>(metadataKey, wrapper.metatype as any);

    if (!controllerDiscovery) return;

    const controllerVersion = controllerDiscovery.getVersion() ?? this.httpConfig.getVersioning()?.defaultVersion;
    const host = controllerDiscovery.getHost();
    const controllerPaths = this.pathFactory.extractControllerPath(controllerDiscovery.getPath());
    const versioningOptions = this.httpConfig.getVersioning();
    const name = wrapper.metatype!.name;

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
          : VERSIONED_CONTROLLER_MAPPING_MESSAGE(name, controllerPath, controllerVersion as VersionValue);

        this.logger.log(message);
      });

      const routes = this.pathsExplorer.scanForPaths(instance);

      return routes.forEach((route) => {
        const { path: paths, requestMethod, methodName, version } = route;
        const callback = this.createCallback(wrapper, methodName);
        const isVersioned = !!((version || controllerVersion) && versioningOptions);
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

          if (isVersioned && versioningOptions!.type !== VersioningType.URI) {
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
                  this.pathFactory.getVersion(metadata) as VersionValue,
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
      next: () => void,
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

  private applyVersionFilter<T extends HttpServer>(routePathMetadata: RoutePathMetadata, handler: Function) {
    const version = this.pathFactory.getVersion(routePathMetadata) as VersionValue;
    return this.httpConfig
      .getHttpAdapterRef()
      .applyVersionFilter(handler, version, routePathMetadata.versioningOptions as any);
  }
}
