import type { BaseMiddlewareConfiguration } from "@venok/integration";
import type { Type } from "@venok/core";

import type { MiddlewareConfigProxy, HttpMiddlewareConsumer, RouteInfo } from "~/interfaces/index.js";
import type { MiddlewareRoutesMapper } from "~/middleware/routes-mapper.js";
import type { AbstractHttpAdapter } from "~/http/adapter.js";

import { flatten } from "@venok/core";

import { filterMiddleware } from "~/helpers/middleware.helper.js";
import { stripEndSlash } from "~/helpers/path.helper.js";

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
type AnyMiddlewareLike = Type | Function | any;

export class MiddlewareBuilder implements HttpMiddlewareConsumer {
  private readonly middlewareCollection = new Set<BaseMiddlewareConfiguration<Type[], RouteInfo>>();

  constructor(
    private readonly middlewareRoutesMapper: MiddlewareRoutesMapper,
    private readonly httpAdapter: AbstractHttpAdapter
  ) {}

  public apply(...middleware: AnyMiddlewareLike[]): MiddlewareConfigProxy {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return new MiddlewareBuilder.ConfigProxy(this, flatten(middleware));
  }

  public build(): BaseMiddlewareConfiguration<Type[], RouteInfo>[] {
    return [...this.middlewareCollection];
  }

  public getHttpAdapter(): AbstractHttpAdapter {
    return this.httpAdapter;
  }

  private static readonly ConfigProxy = class implements MiddlewareConfigProxy {
    private excludedRoutes: RouteInfo[] = [];

    constructor(
      private readonly builder: MiddlewareBuilder,
      private readonly middleware: AnyMiddlewareLike[]
    ) {}

    public getExcludedRoutes(): RouteInfo[] {
      return this.excludedRoutes;
    }

    public exclude(...routes: Array<string | RouteInfo>): MiddlewareConfigProxy {
      this.excludedRoutes = [
        ...this.excludedRoutes,
        ...this.getRoutesFlatList(routes),
      ];
      return this;
    }

    public to(...routes: Array<string | Type | RouteInfo>): HttpMiddlewareConsumer {
      const { middlewareCollection } = this.builder;

      const flattedRoutes = this.getRoutesFlatList(routes);
      const forRoutes = this.removeOverlappedRoutes(flattedRoutes);
      const configuration: BaseMiddlewareConfiguration<Type[], RouteInfo> = {
        middleware: filterMiddleware(this.middleware),
        to: forRoutes,
        exclude: this.excludedRoutes,
      };
      middlewareCollection.add(configuration);
      return this.builder;
    }

    private getRoutesFlatList(routes: Array<string | Type | RouteInfo>): RouteInfo[] {
      const { middlewareRoutesMapper } = this.builder;

      return flatten(routes.map((route) => middlewareRoutesMapper.mapRouteToRouteInfo(route)));
    }

    private removeOverlappedRoutes(routes: RouteInfo[]) {
      // eslint-disable-next-line
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
