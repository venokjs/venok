import { RequestMethod } from "../enums";
import { ExcludeRouteMetadata } from "../interfaces/http/exclude-route.interface";
import { addLeadingSlash } from "./path.helper";

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
