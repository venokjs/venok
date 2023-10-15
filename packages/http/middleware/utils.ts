import { pathToRegexp } from "path-to-regexp";
import { uid } from "uid";
import { ExcludeRouteMetadata, HttpServer, RouteInfo } from "../interfaces";
import { isFunction, isNumber, isString } from "@venok/core/helpers/shared.helper";
import { RequestMethod } from "../enums";
import { addLeadingSlash, isRouteExcluded } from "../helpers";
import { Type } from "@venok/core";

export const mapToExcludeRoute = (routes: (string | RouteInfo)[]): ExcludeRouteMetadata[] => {
  return routes.map((route) => {
    if (isString(route)) {
      return {
        path: route,
        requestMethod: RequestMethod.ALL,
        pathRegex: pathToRegexp(addLeadingSlash(route)),
      };
    }
    return {
      path: route.path,
      requestMethod: route.method,
      pathRegex: pathToRegexp(addLeadingSlash(route.path)),
    };
  });
};

export const filterMiddleware = <T extends Function | Type = any>(
  middleware: T[],
  routes: RouteInfo[],
  httpAdapter: HttpServer,
) => {
  const excludedRoutes = mapToExcludeRoute(routes);
  return middleware.filter(isFunction).map((item: T) => mapToClass(item, excludedRoutes, httpAdapter));
};

export const mapToClass = <T extends Function | Type<any>>(
  middleware: T,
  excludedRoutes: ExcludeRouteMetadata[],
  httpAdapter: HttpServer,
) => {
  if (isMiddlewareClass(middleware)) {
    if (excludedRoutes.length <= 0) {
      return middleware;
    }
    const MiddlewareHost = class extends (middleware as Type) {
      use(...params: unknown[]) {
        const [req, _, next] = params as [Record<string, any>, any, Function];
        const isExcluded = isMiddlewareRouteExcluded(req, excludedRoutes, httpAdapter);
        if (isExcluded) {
          return next();
        }
        return super.use(...params);
      }
    };
    return assignToken(MiddlewareHost, middleware.name);
  }
  return assignToken(
    class {
      use = (...params: unknown[]) => {
        const [req, _, next] = params as [Record<string, any>, any, Function];
        const isExcluded = isMiddlewareRouteExcluded(req, excludedRoutes, httpAdapter);
        if (isExcluded) {
          return next();
        }
        return (middleware as Function)(...params);
      };
    },
  );
};

export function isMiddlewareClass(middleware: any): middleware is Type {
  const middlewareStr = middleware.toString();
  if (middlewareStr.substring(0, 5) === "class") {
    return true;
  }
  const middlewareArr = middlewareStr.split(" ");
  return (
    middlewareArr[0] === "function" && /[A-Z]/.test(middlewareArr[1]?.[0]) && isFunction(middleware.prototype?.use)
  );
}

export function assignToken(metatype: Type, token = uid(21)): Type {
  Object.defineProperty(metatype, "name", { value: token });
  return metatype;
}

export function isMiddlewareRouteExcluded(
  req: Record<string, any>,
  excludedRoutes: ExcludeRouteMetadata[],
  httpAdapter: HttpServer,
): boolean {
  if (excludedRoutes.length <= 0 || !httpAdapter.getRequestUrl || !httpAdapter.getRequestMethod) {
    return false;
  }
  const reqMethod = httpAdapter.getRequestMethod(req) as keyof typeof RequestMethod;
  const originalUrl = httpAdapter.getRequestUrl(req);
  const queryParamsIndex = originalUrl && originalUrl.indexOf("?");
  const pathname =
    isNumber(queryParamsIndex) && queryParamsIndex >= 0 ? originalUrl.slice(0, +queryParamsIndex) : originalUrl;

  return isRouteExcluded(excludedRoutes, pathname, RequestMethod[reqMethod]);
}
