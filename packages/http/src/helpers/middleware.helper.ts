import type { Type } from "@venok/core";

import type { ExcludeRouteMetadata, RouteInfo } from "~/interfaces/index.js";

import { isFunction, isString } from "@venok/core";
import { pathToRegexp } from "path-to-regexp";
import { uid } from "uid";

import { addLeadingSlash } from "~/helpers/path.helper.js";

import { HttpMethod } from "~/enums/method.enum.js";

export const mapToExcludeRoute = (routes: (string | RouteInfo)[]): ExcludeRouteMetadata[] => {
  return routes.map((route) => {
    if (isString(route)) {
      return {
        path: route,
        requestMethod: HttpMethod.ALL,
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
  middleware: T[]
) => {
  return middleware.filter(isFunction).map((item: T) => mapToClass(item));
};

export const mapToClass = <T extends Function | Type<any>>(middleware: T) => {
  if (!isMiddlewareClass(middleware)) {
    return assignToken(
      class {
        use = (...params: unknown[]) => {
          return (middleware as Function)(...params);
        };
      }
    );
  }

  return middleware;
};

export const isMiddlewareClass = (middleware: any): middleware is Type => {
  const middlewareStr = middleware.toString();
  if (middlewareStr.substring(0, 5) === "class") return true;

  const middlewareArr = middlewareStr.split(" ");
  return (
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    middlewareArr[0] === "function" && /[A-Z]/.test(middlewareArr[1]?.[0]) && isFunction(middleware.prototype?.use)
  );
};

export const assignToken = (metatype: Type, token = uid(21)): Type => {
  Object.defineProperty(metatype, "name", { value: token });
  return metatype;
};