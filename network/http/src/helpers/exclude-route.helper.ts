import type { ExcludeRouteMetadata } from "~/interfaces/index.js";

import { RequestMethod } from "~/enums/request-method.enum.js";
import { addLeadingSlash } from "./path.helper.js";

export const isRequestMethodAll = (method: RequestMethod) => {
  return RequestMethod.ALL === method || (method as number) === -1;
};

export function isRouteExcluded(excludedRoutes: ExcludeRouteMetadata[], path: string, requestMethod?: RequestMethod) {
  return excludedRoutes.some((route) => {
    if (isRequestMethodAll(route.requestMethod) || route.requestMethod === requestMethod) {
      return route.pathRegex.exec(addLeadingSlash(path));
    }
    return false;
  });
}
