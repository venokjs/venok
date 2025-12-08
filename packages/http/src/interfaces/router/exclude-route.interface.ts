import type { HttpMethod } from "~/enums/method.enum.js";

export interface ExcludeRouteMetadata {
  /**
   * Route path.
   */
  path: string;

  /**
   * Regular expression representing the route path.
   */
  pathRegex: RegExp;

  /**
   * HTTP request method (e.g., GET, POST).
   */
  requestMethod: HttpMethod;
}
