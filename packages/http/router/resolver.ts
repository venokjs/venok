import { Logger } from "@venok/core/services/logger.service";
import { RoutePathFactory } from "../factory";
import { RouterExceptionFiltersContext } from "../filters/context";
import { RouterExplorer } from "../explorers/router.explorer";
import { ApplicationConfig, MetadataScanner, Type, VenokContainer } from "@venok/core";
import { Injector } from "@venok/core/injector/injector";
import { GraphInspector } from "@venok/core/inspector/graph-inspector";
import { HttpServer } from "../interfaces";
import { InstanceWrapper } from "@venok/core/injector/instance/wrapper";
import { RoutePathMetadata } from "../interfaces";
import { CONTROLLER_WATERMARK, HOST_METADATA, VERSION_METADATA } from "../constants";
import { VersionValue } from "../interfaces";
import { MODULE_PATH } from "@venok/core/constants";
import { CONTROLLER_MAPPING_MESSAGE, VERSIONED_CONTROLLER_MAPPING_MESSAGE } from "../helpers";
import { BadRequestException, NotFoundException } from "../errors";
import { HttpConfig } from "../application/config";
import { isNull, isObject, isUndefined } from "@venok/core/helpers/shared.helper";
import { ExternalContextCreator, VenokProxy } from "@venok/core/context";

export interface Resolver {
  resolve(instance: any, basePath: string): void;
  registerNotFoundHandler(): void;
  registerExceptionHandler(): void;
}

export class RoutesResolver implements Resolver {
  private readonly logger = new Logger(RoutesResolver.name, {
    timestamp: true,
  });
  private readonly routerProxy = new VenokProxy();
  private readonly routePathFactory: RoutePathFactory;
  private readonly routerExceptionsFilter: RouterExceptionFiltersContext;
  private readonly routerExplorer: RouterExplorer;

  constructor(
    private readonly container: VenokContainer,
    private readonly applicationConfig: ApplicationConfig,
    private readonly httpConfig: HttpConfig,
    private readonly injector: Injector,
    graphInspector: GraphInspector,
  ) {
    const httpAdapterRef = httpConfig.getHttpAdapterRef();
    this.routerExceptionsFilter = new RouterExceptionFiltersContext(container, applicationConfig, httpAdapterRef);
    this.routePathFactory = new RoutePathFactory(this.httpConfig);

    const metadataScanner = new MetadataScanner();
    this.routerExplorer = new RouterExplorer(
      metadataScanner,
      this.container,
      this.injector,
      this.routerProxy,
      this.routerExceptionsFilter,
      this.applicationConfig,
      this.routePathFactory,
      graphInspector,
      httpConfig.getHttpAdapterRef(),
    );
  }

  public resolve<T extends HttpServer>(applicationRef: T, globalPrefix: string) {
    const modules = this.container.getModules();
    // Change Controllers to Injectables
    // Global change
    modules.forEach(({ providers, metatype }, moduleName) => {
      const modulePath = this.getModulePathMetadata(metatype);
      this.registerRouters(
        providers as Map<string | symbol | Function, InstanceWrapper<Object>>,
        moduleName,
        globalPrefix,
        modulePath as string,
        applicationRef,
      );
    });
  }

  public registerRouters(
    routes: Map<string | symbol | Function, InstanceWrapper<Object>>,
    moduleName: string,
    globalPrefix: string,
    modulePath: string,
    applicationRef: HttpServer,
  ) {
    routes.forEach((instanceWrapper) => {
      const { metatype } = instanceWrapper;

      if (isUndefined(metatype) || isNull(metatype)) return;

      if (!Reflect.hasMetadata(CONTROLLER_WATERMARK, metatype)) return;

      const host = this.getHostMetadata(metatype as Function | Type);
      const routerPaths = this.routerExplorer.extractRouterPath(metatype as Type<any>);
      const controllerVersion = this.getVersionMetadata(metatype as Function | Type);
      const controllerName = metatype!.name;

      routerPaths.forEach((path) => {
        const pathsToLog = this.routePathFactory.create({
          ctrlPath: path,
          modulePath,
          globalPrefix,
        });
        if (!controllerVersion) {
          pathsToLog.forEach((path) => {
            const logMessage = CONTROLLER_MAPPING_MESSAGE(controllerName, path);
            this.logger.log(logMessage);
          });
        } else {
          pathsToLog.forEach((path) => {
            const logMessage = VERSIONED_CONTROLLER_MAPPING_MESSAGE(controllerName, path, controllerVersion);
            this.logger.log(logMessage);
          });
        }

        const versioningOptions = this.httpConfig.getVersioning();
        const routePathMetadata: RoutePathMetadata = {
          ctrlPath: path,
          modulePath,
          globalPrefix,
          controllerVersion,
          versioningOptions,
        };
        this.routerExplorer.explore(instanceWrapper, moduleName, applicationRef, host as any, routePathMetadata);
      });
    });
  }

  public registerNotFoundHandler() {
    const applicationRef = this.httpConfig.getHttpAdapterRef();
    const callback = <TRequest, TResponse>(req: TRequest, res: TResponse) => {
      const method = applicationRef.getRequestMethod(req);
      const url = applicationRef.getRequestUrl(req);
      throw new NotFoundException(`Cannot ${method} ${url}`);
    };
    const handler = this.routerExceptionsFilter.create({}, callback, undefined as any);
    const proxy = this.routerProxy.createProxy(callback, handler);
    applicationRef.setNotFoundHandler && applicationRef.setNotFoundHandler(proxy, this.httpConfig.getGlobalPrefix());
  }

  public registerExceptionHandler() {
    const callback = <TError, TRequest, TResponse>(err: TError, req: TRequest, res: TResponse, next: Function) => {
      throw this.mapExternalException(err);
    };
    const handler = this.routerExceptionsFilter.create({}, callback as any, undefined as any);
    // REFACTOR
    const proxy = this.routerProxy.createProxy(callback, handler);
    const applicationRef = this.httpConfig.getHttpAdapterRef();
    if ("setErrorHandler" in applicationRef) applicationRef.setErrorHandler(proxy, this.httpConfig.getGlobalPrefix());
  }

  public mapExternalException(err: any) {
    switch (true) {
      // SyntaxError is thrown by Express body-parser when given invalid JSON (#422, #430)
      // URIError is thrown by Express when given a path parameter with an invalid percentage
      // encoding, e.g. '%FF' (#8915)
      case err instanceof SyntaxError || err instanceof URIError:
        return new BadRequestException(err.message);
      default:
        return err;
    }
  }

  private getModulePathMetadata(metatype: Type<unknown>): string | undefined {
    const modulesContainer = this.container.getModules();
    const modulePath = Reflect.getMetadata(MODULE_PATH + modulesContainer.applicationId, metatype);
    return modulePath ?? Reflect.getMetadata(MODULE_PATH, metatype);
  }

  private getHostMetadata(metatype: Type<unknown> | Function): string | string[] | undefined {
    return Reflect.getMetadata(HOST_METADATA, metatype);
  }

  private getVersionMetadata(metatype: Type<unknown> | Function): VersionValue | undefined {
    const versioningConfig = this.httpConfig.getVersioning();
    if (versioningConfig) return Reflect.getMetadata(VERSION_METADATA, metatype) ?? versioningConfig.defaultVersion;
  }
}
