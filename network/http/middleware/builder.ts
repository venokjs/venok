import type { HttpServer, MiddlewareConfigProxy, MiddlewareConsumer, RouteInfo } from "@venok/http";
import type { BaseMiddlewareConfiguration } from "@venok/integration";
import type { Type } from "@venok/core";

import { RouteInfoPathExtractor } from "@venok/http/middleware/extractor.js";
import { RoutesMapper } from "@venok/http/middleware/routes-mapper.js";
import { filterMiddleware } from "@venok/http/middleware/utils.js";
import { stripEndSlash } from "@venok/http/helpers/index.js";

import { flatten } from "@venok/core/helpers/index.js";

export class MiddlewareBuilder implements MiddlewareConsumer {
  private readonly middlewareCollection = new Set<BaseMiddlewareConfiguration<Type[], RouteInfo>>();

  constructor(
    private readonly routesMapper: RoutesMapper,
    private readonly httpAdapter: HttpServer,
    private readonly routeInfoPathExtractor: RouteInfoPathExtractor,
  ) {}

  public apply(...middleware: Array<Type | Function | any>): MiddlewareConfigProxy {
    return new MiddlewareBuilder.ConfigProxy(this, flatten(middleware), this.routeInfoPathExtractor);
  }

  public build(): BaseMiddlewareConfiguration<Type[], RouteInfo>[] {
    return [...this.middlewareCollection];
  }

  public getHttpAdapter(): HttpServer {
    return this.httpAdapter;
  }

  private static readonly ConfigProxy = class implements MiddlewareConfigProxy {
    private excludedRoutes: RouteInfo[] = [];

    constructor(
      private readonly builder: MiddlewareBuilder,
      private readonly middleware: Array<Type | Function | any>,
      private routeInfoPathExtractor: RouteInfoPathExtractor,
    ) {}

    public getExcludedRoutes(): RouteInfo[] {
      return this.excludedRoutes;
    }

    public exclude(...routes: Array<string | RouteInfo>): MiddlewareConfigProxy {
      this.excludedRoutes = [
        ...this.excludedRoutes,
        ...this.getRoutesFlatList(routes).map((route) => ({
          ...route,
          path: this.routeInfoPathExtractor.extractPathFrom(route),
        })),
      ];
      return this;
    }

    public to(...routes: Array<string | Type | RouteInfo>): MiddlewareConsumer {
      const { middlewareCollection } = this.builder;

      const flattedRoutes = this.getRoutesFlatList(routes);
      const forRoutes = this.removeOverlappedRoutes(flattedRoutes);
      const configuration: BaseMiddlewareConfiguration<Type[], RouteInfo> = {
        middleware: filterMiddleware(this.middleware, this.excludedRoutes, this.builder.getHttpAdapter()),
        to: forRoutes,
      };
      middlewareCollection.add(configuration);
      return this.builder;
    }

    private getRoutesFlatList(routes: Array<string | Type | RouteInfo>): RouteInfo[] {
      const { routesMapper } = this.builder;

      return flatten(routes.map((route) => routesMapper.mapRouteToRouteInfo(route)));
    }

    private removeOverlappedRoutes(routes: RouteInfo[]) {
      const regexMatchParams = /(:[^\/]*)/g;
      const wildcard = "([^/]*)";
      const routesWithRegex = routes
        .filter((route) => route.path.includes(":"))
        .map((route) => ({
          method: route.method,
          path: route.path,
          regex: new RegExp("^(" + route.path.replace(regexMatchParams, wildcard) + ")$", "g"),
        }));

      return routes.filter((route) => {
        const isOverlapped = (item: { regex: RegExp } & RouteInfo): boolean => {
          if (route.method !== item.method) return false;

          const normalizedRoutePath = stripEndSlash(route.path);
          return normalizedRoutePath !== item.path && item.regex.test(normalizedRoutePath);
        };
        const routeMatch = routesWithRegex.find(isOverlapped);
        return routeMatch === undefined;
      });
    }
  };
}
