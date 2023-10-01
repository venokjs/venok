import { Routes, RouteTree } from "../interfaces/http/routes.interface";
import { isString } from "@venok/core/helpers/shared.helper";
import { normalizePath } from "./path.helper";

export function flattenRoutePaths(routes: Routes) {
  const result: { module: any; path: string }[] = [];
  routes.forEach((item) => {
    if (item.module && item.path) {
      result.push({ module: item.module, path: item.path });
    }
    if (item.children) {
      const childrenRef = item.children as Routes;
      childrenRef.forEach((child) => {
        if (!isString(child) && child.path) {
          child.path = normalizePath(normalizePath(item.path) + normalizePath(child.path));
        } else {
          result.push({ path: item.path, module: child });
        }
      });
      result.push(...flattenRoutePaths(childrenRef));
    }
  });
  return result;
}
