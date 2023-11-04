import { Injector } from "@venok/core/injector/injector";
import { RouterExceptionFiltersContext } from "../filters/context";
import { Logger } from "@venok/core/services/logger.service";
import { RoutesMapper } from "./routes-mapper";
import { MiddlewareResolver } from "./resolver";
import { HttpServer } from "../interfaces";
import { GraphInspector } from "@venok/core/inspector/graph-inspector";
import { RouteInfoPathExtractor } from "./extractor";
import { MiddlewareContainer } from "./container";
import { ApplicationConfig, ContextId, InjectionToken, Type, VenokContainer } from "@venok/core";
import { ApplicationContextOptions } from "@venok/core/interfaces/application/context-options.interface";
import { MiddlewareBuilder } from "./builder";
import { Module } from "@venok/core/injector/module/module";
import { MiddlewareConfiguration, RouteInfo, VenokMiddleware } from "../interfaces";
import { isUndefined } from "@venok/core/helpers/shared.helper";
import { RuntimeException } from "@venok/core/errors/exceptions";
import { Entrypoint } from "@venok/core/inspector/interfaces/entrypoint.interface";
import { MiddlewareEntrypointMetadata } from "../explorers/router.explorer";
import { RequestMethod } from "../enums";
import { InstanceWrapper } from "@venok/core/injector/instance/wrapper";
import { ExecutionContextHost } from "@venok/core/context/execution-host";
import { STATIC_CONTEXT } from "@venok/core/injector/constants";
import { isRequestMethodAll } from "../helpers";
import { ContextIdFactory } from "../factory";
import { REQUEST_CONTEXT_ID } from "../constants";
import { HttpConfig } from "../application/config";
import { InvalidMiddlewareException } from "../errors/invalid-middleware.exception";
import { VenokHttpModule } from "../interfaces";
import { VenokProxy } from "@venok/core/context";
import { RouterProxyCallback } from "../interfaces";

export class MiddlewareModule<TAppOptions extends ApplicationContextOptions = ApplicationContextOptions> {
  private readonly routerProxy = new VenokProxy();
  private readonly exceptionFiltersCache = new WeakMap();
  private readonly logger = new Logger(Module.name);

  private injector!: Injector;
  private routerExceptionFilter!: RouterExceptionFiltersContext;
  private routesMapper!: RoutesMapper;
  private resolver!: MiddlewareResolver;
  private container!: VenokContainer;
  private httpAdapter!: HttpServer;
  private graphInspector!: GraphInspector;
  private appOptions!: TAppOptions;
  private routeInfoPathExtractor!: RouteInfoPathExtractor;

  public async register(
    middlewareContainer: MiddlewareContainer,
    container: VenokContainer,
    applicationConfig: ApplicationConfig,
    httpConfig: HttpConfig,
    injector: Injector,
    httpAdapter: HttpServer,
    graphInspector: GraphInspector,
    options: TAppOptions,
  ) {
    this.appOptions = options;

    const appRef = httpConfig.getHttpAdapterRef();
    this.routerExceptionFilter = new RouterExceptionFiltersContext(container, applicationConfig, appRef);
    this.routesMapper = new RoutesMapper(container, httpConfig);
    this.resolver = new MiddlewareResolver(middlewareContainer, injector);
    this.routeInfoPathExtractor = new RouteInfoPathExtractor(httpConfig);
    this.injector = injector;
    this.container = container;
    this.httpAdapter = httpAdapter;
    this.graphInspector = graphInspector;

    const modules = container.getModules();
    await this.resolveMiddleware(middlewareContainer, modules);
  }

  public async resolveMiddleware(middlewareContainer: MiddlewareContainer, modules: Map<string, Module>) {
    const moduleEntries = [...modules.entries()];
    const loadMiddlewareConfiguration = async ([moduleName, moduleRef]: [string, Module]) => {
      await this.loadConfiguration(middlewareContainer, moduleRef, moduleName);
      await this.resolver.resolveInstances(moduleRef, moduleName);
    };
    await Promise.all(moduleEntries.map(loadMiddlewareConfiguration));
  }

  public async loadConfiguration(middlewareContainer: MiddlewareContainer, moduleRef: Module, moduleKey: string) {
    const { instance } = moduleRef;
    if (!(instance as VenokHttpModule).configure) return;

    const middlewareBuilder = new MiddlewareBuilder(this.routesMapper, this.httpAdapter, this.routeInfoPathExtractor);
    try {
      await (instance as VenokHttpModule).configure(middlewareBuilder);
    } catch (err) {
      if (!this.appOptions.preview) throw err;

      const warningMessage =
        `Warning! "${moduleRef.name}" module exposes a "configure" method that throws an exception in the preview mode` +
        ` (possibly due to missing dependencies). Note: you can ignore this message, just be aware that some of those conditional middlewares will not be reflected in your graph.`;
      this.logger.warn(warningMessage);
    }

    if (!(middlewareBuilder instanceof MiddlewareBuilder)) return;

    const config = middlewareBuilder.build();
    middlewareContainer.insertConfig(config, moduleKey);
  }

  public async registerMiddleware(middlewareContainer: MiddlewareContainer, applicationRef: any) {
    const configs = middlewareContainer.getConfigurations();
    const registerAllConfigs = async (moduleKey: string, middlewareConfig: MiddlewareConfiguration[]) => {
      for (const config of middlewareConfig) {
        await this.registerMiddlewareConfig(middlewareContainer, config, moduleKey, applicationRef);
      }
    };

    const entriesSortedByDistance = [...configs.entries()].sort(([moduleA], [moduleB]) => {
      return this.container.getModuleByKey(moduleA).distance - this.container.getModuleByKey(moduleB).distance;
    });
    for (const [moduleRef, moduleConfigurations] of entriesSortedByDistance) {
      await registerAllConfigs(moduleRef, [...moduleConfigurations]);
    }
  }

  public async registerMiddlewareConfig(
    middlewareContainer: MiddlewareContainer,
    config: MiddlewareConfiguration,
    moduleKey: string,
    applicationRef: any,
  ) {
    const { forRoutes } = config;
    for (const routeInfo of forRoutes) {
      await this.registerRouteMiddleware(
        middlewareContainer,
        routeInfo as RouteInfo,
        config,
        moduleKey,
        applicationRef,
      );
    }
  }

  public async registerRouteMiddleware(
    middlewareContainer: MiddlewareContainer,
    routeInfo: RouteInfo,
    config: MiddlewareConfiguration,
    moduleKey: string,
    applicationRef: any,
  ) {
    const middlewareCollection = [].concat(config.middleware);
    const moduleRef = this.container.getModuleByKey(moduleKey);

    for (const metatype of middlewareCollection) {
      const collection = middlewareContainer.getMiddlewareCollection(moduleKey);
      const instanceWrapper = collection.get(metatype);
      if (isUndefined(instanceWrapper)) throw new RuntimeException();

      if (instanceWrapper.isTransient) return;

      this.graphInspector.insertClassNode(moduleRef, instanceWrapper, "middleware");
      const middlewareDefinition: Entrypoint<MiddlewareEntrypointMetadata> = {
        type: "middleware",
        methodName: "use",
        className: instanceWrapper.name,
        classNodeId: instanceWrapper.id,
        metadata: {
          key: routeInfo.path,
          path: routeInfo.path,
          requestMethod: (RequestMethod[routeInfo.method] as keyof typeof RequestMethod) ?? "ALL",
          version: routeInfo.version,
        },
      };
      this.graphInspector.insertEntrypointDefinition(middlewareDefinition, instanceWrapper.id);

      await this.bindHandler(instanceWrapper, applicationRef, routeInfo, moduleRef, collection);
    }
  }

  private async bindHandler(
    wrapper: InstanceWrapper<VenokMiddleware>,
    applicationRef: HttpServer,
    routeInfo: RouteInfo,
    moduleRef: Module,
    collection: Map<InjectionToken, InstanceWrapper>,
  ) {
    const { instance, metatype } = wrapper as { instance: VenokMiddleware; metatype: Function | Type };
    if (isUndefined(instance?.use)) throw new InvalidMiddlewareException(metatype.name);

    const isStatic = wrapper.isDependencyTreeStatic();
    if (isStatic) {
      const proxy = await this.createProxy(instance);
      return this.registerHandler(applicationRef, routeInfo, proxy);
    }

    const isTreeDurable = wrapper.isDependencyTreeDurable();

    await this.registerHandler(
      applicationRef,
      routeInfo,
      async <TRequest, TResponse>(req: TRequest, res: TResponse, next: () => void) => {
        try {
          const contextId = this.getContextId(req, isTreeDurable);
          const contextInstance = await this.injector.loadPerContext(instance, moduleRef, collection, contextId);
          const proxy = await this.createProxy<TRequest, TResponse>(contextInstance as any, contextId);
          return proxy(req, res, next);
        } catch (err) {
          let exceptionsHandler = this.exceptionFiltersCache.get(instance.use);
          if (!exceptionsHandler) {
            exceptionsHandler = this.routerExceptionFilter.create(
              instance,
              instance.use as RouterProxyCallback,
              undefined as any,
            );
            this.exceptionFiltersCache.set(instance.use, exceptionsHandler);
          }
          const host = new ExecutionContextHost([req, res, next]);
          exceptionsHandler.next(err, host);
        }
      },
    );
  }

  private async createProxy<TRequest = unknown, TResponse = unknown>(
    instance: VenokMiddleware,
    contextId = STATIC_CONTEXT,
  ): Promise<(req: TRequest, res: TResponse, next: () => void) => void> {
    const exceptionsHandler = this.routerExceptionFilter.create(
      instance,
      instance.use as RouterProxyCallback,
      undefined as any,
      contextId,
    );
    const middleware = instance.use.bind(instance);
    return this.routerProxy.createProxy(middleware as RouterProxyCallback, exceptionsHandler);
  }

  private async registerHandler(
    applicationRef: HttpServer,
    routeInfo: RouteInfo,
    proxy: <TRequest, TResponse>(req: TRequest, res: TResponse, next: () => void) => void,
  ) {
    const { method } = routeInfo;
    const paths = this.routeInfoPathExtractor.extractPathsFrom(routeInfo);
    const isMethodAll = isRequestMethodAll(method);
    const requestMethod = RequestMethod[method];
    const router = await applicationRef.createMiddlewareFactory(method);
    const middlewareFunction = isMethodAll
      ? proxy
      : <TRequest, TResponse>(req: TRequest, res: TResponse, next: () => void) => {
          if (applicationRef.getRequestMethod && applicationRef.getRequestMethod(req) === requestMethod) {
            return proxy(req, res, next);
          }
          return next();
        };
    paths.forEach((path) => router(path, middlewareFunction));
  }

  private getContextId(request: any, isTreeDurable: boolean): ContextId {
    const contextId = ContextIdFactory.getByRequest(request);
    if (!request[REQUEST_CONTEXT_ID]) {
      Object.defineProperty(request, REQUEST_CONTEXT_ID, {
        value: contextId,
        enumerable: false,
        writable: false,
        configurable: false,
      });

      const requestProviderValue = isTreeDurable ? contextId.payload : request;
      this.container.registerRequestProvider(requestProviderValue, contextId);
    }
    return contextId;
  }
}
