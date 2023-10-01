import { ApplicationConfig, ContextId, MetadataScanner, Type, VenokContainer } from "@venok/core";
import { HttpExceptionsHandler } from "../exceptions/handler";
import { RequestMethod, VersioningType } from "../enums";
import { HttpServer, RouteDefinition, RoutePathMetadata, VersionValue } from "../interfaces";
import { HttpExecutionContext } from "../context/http.context";
import { PathsExplorer } from "./path.explorer";
import { ContextIdFactory, RouteParamsFactory, RoutePathFactory, RouterMethodFactory } from "../factory";
import { Logger } from "@venok/core/services/logger.service";
import { Injector } from "@venok/core/injector/injector";
import { HttpProxy, RouterProxyCallback } from "../exceptions/proxy";
import { GraphInspector } from "@venok/core/inspector/graph-inspector";
import { AbstractHttpAdapter } from "../adapter/adapter";
import { PipesConsumer, PipesContextCreator } from "@venok/core/pipes";
import { GuardsConsumer, GuardsContextCreator } from "@venok/core/guards";
import { InterceptorsConsumer, InterceptorsContextCreator } from "@venok/core/interceptors";
import { InstanceWrapper } from "@venok/core/injector/instance/wrapper";
import { PATH_METADATA, REQUEST_CONTEXT_ID } from "../constants";
import { isUndefined } from "@venok/core/helpers/shared.helper";
import { UnknownRequestMappingException } from "../errors/unknown-request-mapping.exception";
import { addLeadingSlash, ROUTE_MAPPED_MESSAGE, VERSIONED_ROUTE_MAPPED_MESSAGE } from "../helpers";
import { Entrypoint } from "@venok/core/inspector/interfaces/entrypoint.interface";
import { pathToRegexp } from "path-to-regexp";
import { InternalServerErrorException } from "../errors";
import { STATIC_CONTEXT } from "@venok/core/injector/constants";
import { Module } from "@venok/core/injector/module/module";
import { ExecutionContextHost } from "@venok/core/context/execution-host";

export interface ExceptionsFilter {
  create(
    instance: Object,
    callback: Function,
    module: string,
    contextId?: ContextId,
    inquirerId?: string,
  ): HttpExceptionsHandler;
}

export type HttpEntrypointMetadata = {
  path: string;
  requestMethod: keyof typeof RequestMethod;
  methodVersion?: VersionValue;
  controllerVersion?: VersionValue;
};

export type MiddlewareEntrypointMetadata = {
  path: string;
  requestMethod: keyof typeof RequestMethod;
  version?: VersionValue;
};

export class RouterExplorer {
  private readonly executionContextCreator: HttpExecutionContext;
  private readonly pathsExplorer: PathsExplorer;
  private readonly routerMethodFactory = new RouterMethodFactory();
  private readonly logger = new Logger(RouterExplorer.name, {
    timestamp: true,
  });
  private readonly exceptionFiltersCache = new WeakMap();

  constructor(
    metadataScanner: MetadataScanner,
    private readonly container: VenokContainer,
    private readonly injector: Injector,
    private readonly routerProxy: HttpProxy,
    private readonly exceptionsFilter: ExceptionsFilter,
    config: ApplicationConfig,
    private readonly routePathFactory: RoutePathFactory,
    private readonly graphInspector: GraphInspector,
    private readonly applicationRef: AbstractHttpAdapter,
  ) {
    this.pathsExplorer = new PathsExplorer(metadataScanner);

    const routeParamsFactory = new RouteParamsFactory();
    const pipesContextCreator = new PipesContextCreator(container, config);
    const pipesConsumer = new PipesConsumer();
    const guardsContextCreator = new GuardsContextCreator(container, config);
    const guardsConsumer = new GuardsConsumer();
    const interceptorsContextCreator = new InterceptorsContextCreator(container, config);
    const interceptorsConsumer = new InterceptorsConsumer();

    this.executionContextCreator = new HttpExecutionContext(
      routeParamsFactory,
      pipesContextCreator,
      pipesConsumer,
      guardsContextCreator,
      guardsConsumer,
      interceptorsContextCreator,
      interceptorsConsumer,
      applicationRef,
    );
  }

  public explore<T extends HttpServer = any>(
    instanceWrapper: InstanceWrapper,
    moduleKey: string,
    applicationRef: T,
    host: string | RegExp | Array<string | RegExp>,
    routePathMetadata: RoutePathMetadata,
  ) {
    const { instance } = instanceWrapper;
    const routerPaths = this.pathsExplorer.scanForPaths(instance);
    this.applyPathsToRouterProxy(applicationRef, routerPaths, instanceWrapper, moduleKey, routePathMetadata, host);
  }

  public extractRouterPath(metatype: Type<Object>): string[] {
    const path = Reflect.getMetadata(PATH_METADATA, metatype);

    if (isUndefined(path)) {
      return [];
    }
    if (Array.isArray(path)) {
      return path.map((p) => addLeadingSlash(p));
    }
    return [addLeadingSlash(path)];
  }

  public applyPathsToRouterProxy<T extends HttpServer>(
    router: T,
    routeDefinitions: RouteDefinition[],
    instanceWrapper: InstanceWrapper,
    moduleKey: string,
    routePathMetadata: RoutePathMetadata,
    host: string | RegExp | Array<string | RegExp>,
  ) {
    (routeDefinitions || []).forEach((routeDefinition) => {
      const { version: methodVersion } = routeDefinition;
      routePathMetadata.methodVersion = methodVersion;

      this.applyCallbackToRouter(router, routeDefinition, instanceWrapper, moduleKey, routePathMetadata, host);
    });
  }

  private applyCallbackToRouter<T extends HttpServer>(
    router: T,
    routeDefinition: RouteDefinition,
    instanceWrapper: InstanceWrapper,
    moduleKey: string,
    routePathMetadata: RoutePathMetadata,
    host: string | RegExp | Array<string | RegExp>,
  ) {
    const { path: paths, requestMethod, targetCallback, methodName } = routeDefinition;

    const { instance } = instanceWrapper;
    const routerMethodRef = this.routerMethodFactory.get(router, requestMethod).bind(router);

    const isRequestScoped = !instanceWrapper.isDependencyTreeStatic();
    const proxy = isRequestScoped
      ? this.createRequestScopedHandler(
          instanceWrapper,
          requestMethod,
          this.container.getModuleByKey(moduleKey),
          moduleKey,
          methodName,
        )
      : this.createCallbackProxy(instance, targetCallback, methodName, moduleKey, requestMethod);

    const isVersioned =
      (routePathMetadata.methodVersion || routePathMetadata.controllerVersion) && routePathMetadata.versioningOptions;
    let routeHandler = this.applyHostFilter(host, proxy);

    paths.forEach((path) => {
      if (isVersioned && routePathMetadata.versioningOptions!.type !== VersioningType.URI) {
        // All versioning (except for URI Versioning) is done via the "Version Filter"
        routeHandler = this.applyVersionFilter(router, routePathMetadata, routeHandler);
      }

      routePathMetadata.methodPath = path;
      const pathsToRegister = this.routePathFactory.create(routePathMetadata, requestMethod);
      pathsToRegister.forEach((path: string) => {
        const entrypointDefinition: Entrypoint<HttpEntrypointMetadata> = {
          type: "http-endpoint",
          methodName,
          className: instanceWrapper.name,
          classNodeId: instanceWrapper.id,
          metadata: {
            key: path,
            path,
            requestMethod: RequestMethod[requestMethod] as keyof typeof RequestMethod,
            methodVersion: routePathMetadata.methodVersion as VersionValue,
            controllerVersion: routePathMetadata.controllerVersion as VersionValue,
          },
        };

        this.copyMetadataToCallback(targetCallback, routeHandler);
        routerMethodRef(path, routeHandler);

        this.graphInspector.insertEntrypointDefinition<HttpEntrypointMetadata>(
          entrypointDefinition,
          instanceWrapper.id,
        );
      });

      const pathsToLog = this.routePathFactory.create(
        {
          ...routePathMetadata,
          versioningOptions: undefined,
        },
        requestMethod,
      );
      pathsToLog.forEach((path: string) => {
        if (isVersioned) {
          const version = this.routePathFactory.getVersion(routePathMetadata);
          this.logger.log(VERSIONED_ROUTE_MAPPED_MESSAGE(path, requestMethod, version as VersionValue));
        } else {
          this.logger.log(ROUTE_MAPPED_MESSAGE(path, requestMethod));
        }
      });
    });
  }

  private applyHostFilter(host: string | RegExp | Array<string | RegExp>, handler: Function) {
    if (!host) {
      return handler;
    }

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
      const hostname = this.applicationRef.getRequestHostname(req) || "";

      for (const exp of hostRegExps) {
        const match = hostname.match(exp.regexp);
        if (match) {
          if (exp.keys.length > 0) {
            exp.keys.forEach((key, i) => (req.hosts[key.name] = match[i + 1]));
          } else if (exp.regexp && match.groups) {
            for (const groupName in match.groups) {
              req.hosts[groupName] = match.groups[groupName];
            }
          }
          return handler(req, res, next);
        }
      }
      if (!next) {
        throw new InternalServerErrorException(unsupportedFilteringErrorMessage);
      }
      return next();
    };
  }

  private applyVersionFilter<T extends HttpServer>(router: T, routePathMetadata: RoutePathMetadata, handler: Function) {
    const version = this.routePathFactory.getVersion(routePathMetadata) as VersionValue;
    return router.applyVersionFilter(handler, version, routePathMetadata.versioningOptions as any);
  }

  private createCallbackProxy(
    instance: Object,
    callback: RouterProxyCallback,
    methodName: string,
    moduleRef: string,
    requestMethod: RequestMethod,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ) {
    const executionContext = this.executionContextCreator.create(
      instance,
      callback,
      methodName,
      moduleRef,
      requestMethod,
      contextId,
      inquirerId,
    );
    const exceptionFilter = this.exceptionsFilter.create(instance, callback, moduleRef, contextId, inquirerId);
    return this.routerProxy.createProxy(executionContext as RouterProxyCallback, exceptionFilter);
  }

  public createRequestScopedHandler(
    instanceWrapper: InstanceWrapper,
    requestMethod: RequestMethod,
    moduleRef: Module,
    moduleKey: string,
    methodName: string,
  ) {
    const { instance } = instanceWrapper;
    const collection = moduleRef.injectables;

    const isTreeDurable = instanceWrapper.isDependencyTreeDurable();

    return async <TRequest extends Record<any, any>, TResponse>(req: TRequest, res: TResponse, next: () => void) => {
      try {
        const contextId = this.getContextId(req, isTreeDurable);
        const contextInstance = await this.injector.loadPerContext(instance, moduleRef, collection, contextId);
        await this.createCallbackProxy(
          contextInstance,
          contextInstance[methodName],
          methodName,
          moduleKey,
          requestMethod,
          contextId,
          instanceWrapper.id,
        )(req, res, next);
      } catch (err) {
        let exceptionFilter = this.exceptionFiltersCache.get(instance[methodName]);
        if (!exceptionFilter) {
          exceptionFilter = this.exceptionsFilter.create(instance, instance[methodName], moduleKey);
          this.exceptionFiltersCache.set(instance[methodName], exceptionFilter);
        }
        const host = new ExecutionContextHost([req, res, next]);
        exceptionFilter.next(err, host);
      }
    };
  }

  private getContextId<T extends Record<any, unknown> = any>(request: T, isTreeDurable: boolean): ContextId {
    const contextId = ContextIdFactory.getByRequest(request);
    if (!request[REQUEST_CONTEXT_ID as any]) {
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

  private copyMetadataToCallback(originalCallback: RouterProxyCallback, targetCallback: Function) {
    for (const key of Reflect.getMetadataKeys(originalCallback)) {
      Reflect.defineMetadata(key, Reflect.getMetadata(key, originalCallback), targetCallback);
    }
  }
}
