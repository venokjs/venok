import type { ExcludeRouteMetadata, Routes } from "~/interfaces/index.js";

import { isString } from "@venok/core";

import { addLeadingSlash, normalizePath } from "./path.helper.js";
import { HttpMethod } from "~/enums/method.enum.js";

export const isRequestMethodAll = (method: HttpMethod) => {
  return HttpMethod.ALL === method || (method as number) === -1;
};

export const isRouteExcluded = (excludedRoutes: ExcludeRouteMetadata[], path: string, requestMethod?: HttpMethod)=> {
  return excludedRoutes.some((route) => {
    if (isRequestMethodAll(route.requestMethod) || route.requestMethod === requestMethod) {
      return route.pathRegex.exec(addLeadingSlash(path));
    }
    return false;
  });
};

export const flattenRoutePaths = (routes: Routes)=> {
  const result: { module: any; path: string }[] = [];

  routes.forEach((item) => {
    if (item.module && item.path) result.push({ module: item.module, path: item.path });

    if (item.children) {
      const childrenRef = item.children as Routes;
      childrenRef.forEach((child) => {
        if (!isString(child) && child.path) child.path = normalizePath(normalizePath(item.path) + normalizePath(child.path));
        else result.push({ path: item.path, module: child });
      });
      result.push(...flattenRoutePaths(childrenRef));
    }
  });

  return result;
};
