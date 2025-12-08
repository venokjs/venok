import type { RouteTree } from "~/interfaces/index.js";

import { describe, expect, it } from "bun:test";

import { flattenRoutePaths, isRequestMethodAll, isRouteExcluded } from "~/helpers/route.helper.js";
import { HttpMethod } from "~/enums/method.enum.js";

describe("Route Helper", () => {
  describe("isRequestMethodAll", () => {
    it("should return true for HttpMethod.ALL", () => {
      expect(isRequestMethodAll(HttpMethod.ALL)).toBe(true);
    });

    it("should return true for -1 (numeric equivalent)", () => {
      expect(isRequestMethodAll(-1 as HttpMethod)).toBe(true);
    });

    it("should return false for specific HTTP methods", () => {
      expect(isRequestMethodAll(HttpMethod.GET)).toBe(false);
      expect(isRequestMethodAll(HttpMethod.POST)).toBe(false);
      expect(isRequestMethodAll(HttpMethod.PUT)).toBe(false);
      expect(isRequestMethodAll(HttpMethod.DELETE)).toBe(false);
      expect(isRequestMethodAll(HttpMethod.PATCH)).toBe(false);
      expect(isRequestMethodAll(HttpMethod.OPTIONS)).toBe(false);
      expect(isRequestMethodAll(HttpMethod.HEAD)).toBe(false);
    });

    it("should return false for other numeric values", () => {
      expect(isRequestMethodAll(0 as HttpMethod)).toBe(false); // GET
      expect(isRequestMethodAll(1 as HttpMethod)).toBe(false); // POST
      expect(isRequestMethodAll(2 as HttpMethod)).toBe(false); // PUT
      expect(isRequestMethodAll(100 as HttpMethod)).toBe(false);
    });

    it("should handle edge cases", () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(isRequestMethodAll(undefined as any)).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(isRequestMethodAll(null as any)).toBe(false);
    });
  });

  describe("isRouteExcluded", () => {
    const createExcludeRoute = (path: string, method: HttpMethod = HttpMethod.ALL) => ({
      path,
      requestMethod: method,
      /* eslint-disable-next-line */
      pathRegex: new RegExp(`^${path.replace(/\*/g, ".*").replace(/:[^/]+/g, "[^/]+")}\/?$`),
    });

    it("should return true when route matches excluded path with ALL method", () => {
      const excludedRoutes = [
        createExcludeRoute("/health", HttpMethod.ALL),
        createExcludeRoute("/metrics", HttpMethod.ALL),
      ];

      expect(isRouteExcluded(excludedRoutes, "/health")).toBe(true);
      expect(isRouteExcluded(excludedRoutes, "/metrics")).toBe(true);
    });

    it("should return true when route matches specific method", () => {
      const excludedRoutes = [
        createExcludeRoute("/users", HttpMethod.GET),
        createExcludeRoute("/posts", HttpMethod.POST),
      ];

      expect(isRouteExcluded(excludedRoutes, "/users", HttpMethod.GET)).toBe(true);
      expect(isRouteExcluded(excludedRoutes, "/posts", HttpMethod.POST)).toBe(true);
    });

    it("should return false when method doesn't match", () => {
      const excludedRoutes = [createExcludeRoute("/users", HttpMethod.GET)];

      expect(isRouteExcluded(excludedRoutes, "/users", HttpMethod.POST)).toBe(false);
      expect(isRouteExcluded(excludedRoutes, "/users", HttpMethod.DELETE)).toBe(false);
    });

    it("should return false when path doesn't match", () => {
      const excludedRoutes = [createExcludeRoute("/health", HttpMethod.ALL)];

      expect(isRouteExcluded(excludedRoutes, "/status")).toBe(false);
      expect(isRouteExcluded(excludedRoutes, "/health/check")).toBe(false);
    });

    it("should handle wildcard patterns", () => {
      const excludedRoutes = [
        {
          path: "/api/*",
          requestMethod: HttpMethod.ALL,
          pathRegex: /^\/api\/.*\/?$/,
        },
      ];

      expect(isRouteExcluded(excludedRoutes, "/api/users")).toBe(true);
      expect(isRouteExcluded(excludedRoutes, "/api/posts/123")).toBe(true);
      expect(isRouteExcluded(excludedRoutes, "/other/path")).toBe(false);
    });

    it("should handle parameter patterns", () => {
      const excludedRoutes = [
        {
          path: "/users/:id",
          requestMethod: HttpMethod.GET,
          pathRegex: /^\/users\/[^/]+\/?$/,
        },
      ];

      expect(isRouteExcluded(excludedRoutes, "/users/123", HttpMethod.GET)).toBe(true);
      expect(isRouteExcluded(excludedRoutes, "/users/abc", HttpMethod.GET)).toBe(true);
      expect(isRouteExcluded(excludedRoutes, "/users/123", HttpMethod.POST)).toBe(false);
      expect(isRouteExcluded(excludedRoutes, "/users", HttpMethod.GET)).toBe(false);
    });

    it("should handle paths with leading slash", () => {
      const excludedRoutes = [createExcludeRoute("/health", HttpMethod.ALL)];

      expect(isRouteExcluded(excludedRoutes, "health")).toBe(true); // addLeadingSlash should handle this
    });

    it("should return false for empty excluded routes", () => {
      expect(isRouteExcluded([], "/any/path")).toBe(false);
    });

    it("should handle multiple excluded routes", () => {
      const excludedRoutes = [
        createExcludeRoute("/health", HttpMethod.ALL),
        createExcludeRoute("/users", HttpMethod.GET),
        createExcludeRoute("/posts", HttpMethod.POST),
      ];

      expect(isRouteExcluded(excludedRoutes, "/health")).toBe(true);
      expect(isRouteExcluded(excludedRoutes, "/users", HttpMethod.GET)).toBe(true);
      expect(isRouteExcluded(excludedRoutes, "/posts", HttpMethod.POST)).toBe(true);
      expect(isRouteExcluded(excludedRoutes, "/users", HttpMethod.POST)).toBe(false);
      expect(isRouteExcluded(excludedRoutes, "/other")).toBe(false);
    });

    it("should handle -1 as ALL method", () => {
      const excludedRoutes = [
        {
          path: "/health",
          requestMethod: -1 as HttpMethod,
          pathRegex: /^\/health\/?$/,
        },
      ];

      expect(isRouteExcluded(excludedRoutes, "/health", HttpMethod.GET)).toBe(true);
      expect(isRouteExcluded(excludedRoutes, "/health", HttpMethod.POST)).toBe(true);
    });

    it("should handle undefined request method", () => {
      const excludedRoutes = [createExcludeRoute("/health", HttpMethod.ALL)];

      expect(isRouteExcluded(excludedRoutes, "/health", undefined)).toBe(true);
    });
  });

  describe("flattenRoutePaths", () => {
    it("should handle simple routes without children", () => {
      const routes = [
        { module: "UserModule", path: "/users" },
        { module: "PostModule", path: "/posts" },
      ];

      const result = flattenRoutePaths(routes as unknown as RouteTree[]);

      expect(result).toEqual([
        { module: "UserModule", path: "/users" },
        { module: "PostModule", path: "/posts" },
      ]);
    });

    it("should flatten routes with children", () => {
      const routes = [
        {
          path: "/api",
          children: [
            { module: "UserModule", path: "/users" },
            { module: "PostModule", path: "/posts" },
          ],
        },
      ];

      const result = flattenRoutePaths(routes as unknown as RouteTree[]);

      expect(result).toEqual([
        { module: "UserModule", path: "/api/users" },
        { module: "PostModule", path: "/api/posts" },
      ]);
    });

    it("should handle nested children", () => {
      const routes = [
        {
          path: "/api",
          children: [
            {
              path: "/v1",
              children: [
                { module: "UserModule", path: "/users" },
                { module: "PostModule", path: "/posts" },
              ],
            },
          ],
        },
      ];

      const result = flattenRoutePaths(routes as unknown as RouteTree[]);

      expect(result).toEqual([
        { module: "UserModule", path: "/api/v1/users" },
        { module: "PostModule", path: "/api/v1/posts" },
      ]);
    });

    it("should handle string children as modules", () => {
      const routes = [
        {
          path: "/api",
          children: [
            "UserModule",
            "PostModule",
          ],
        },
      ];

      const result = flattenRoutePaths(routes as unknown as RouteTree[]);

      expect(result).toEqual([
        { path: "/api", module: "UserModule" },
        { path: "/api", module: "PostModule" },
      ]);
    });

    it("should handle mixed children types", () => {
      const routes = [
        {
          path: "/api",
          children: [
            { module: "UserModule", path: "/users" },
            "DirectModule",
            { module: "PostModule", path: "/posts" },
          ],
        },
      ];

      const result = flattenRoutePaths(routes as unknown as RouteTree[]);

      expect(result).toEqual([
        { path: "/api", module: "DirectModule" },
        { module: "UserModule", path: "/api/users" },
        { module: "PostModule", path: "/api/posts" },
      ]);
    });

    it("should normalize paths correctly", () => {
      const routes = [
        {
          path: "/api/",
          children: [
            { module: "UserModule", path: "users/" },
            { module: "PostModule", path: "/posts" },
          ],
        },
      ];

      const result = flattenRoutePaths(routes as unknown as RouteTree[]);

      expect(result).toEqual([
        { module: "UserModule", path: "/api/users" },
        { module: "PostModule", path: "/api/posts" },
      ]);
    });

    it("should handle empty paths", () => {
      const routes = [
        {
          path: "/api",
          children: [
            { module: "RootModule", path: "" },
            { module: "UserModule", path: "/users" },
          ],
        },
      ];

      const result = flattenRoutePaths(routes as unknown as RouteTree[]);

      // Note: Current implementation treats child object with empty path as module
      expect(result).toEqual([
        { module: { module: "RootModule", path: "" }, path: "/api" },
        { module: "UserModule", path: "/api/users" },
      ]);
    });

    it("should handle routes without module", () => {
      const routes = [
        { path: "/health" },
        { module: "UserModule", path: "/users" },
      ];

      const result = flattenRoutePaths(routes as unknown as RouteTree[]);

      expect(result).toEqual([{ module: "UserModule", path: "/users" }]);
    });

    it("should handle routes without path", () => {
      const routes = [
        { module: "SomeModule" },
        { module: "UserModule", path: "/users" },
      ];

      const result = flattenRoutePaths(routes as unknown as RouteTree[]);

      expect(result).toEqual([{ module: "UserModule", path: "/users" }]);
    });

    it("should handle empty routes array", () => {
      const result = flattenRoutePaths([]);
      expect(result).toEqual([]);
    });

    it("should handle complex nested structure", () => {
      const routes = [
        {
          path: "/api",
          module: "ApiModule",
          children: [
            {
              path: "/v1",
              children: [
                { module: "UserModule", path: "/users" },
                {
                  path: "/admin",
                  children: [
                    { module: "AdminUserModule", path: "/users" },
                    "DirectAdminModule",
                  ],
                },
              ],
            },
            { module: "LegacyModule", path: "/legacy" },
          ],
        },
      ];

      const result = flattenRoutePaths(routes as unknown as RouteTree[]);

      expect(result).toEqual([
        { module: "ApiModule", path: "/api" },
        { module: "UserModule", path: "/api/v1/users" },
        { path: "/api/v1/admin", module: "DirectAdminModule" },
        { module: "AdminUserModule", path: "/api/v1/admin/users" },
        { module: "LegacyModule", path: "/api/legacy" },
      ]);
    });

    it("should handle paths with special characters", () => {
      const routes = [
        {
          path: "/api/:version",
          children: [
            { module: "UserModule", path: "/users/:id" },
            { module: "PostModule", path: "/posts/*" },
          ],
        },
      ];

      const result = flattenRoutePaths(routes as unknown as RouteTree[]);

      expect(result).toEqual([
        { module: "UserModule", path: "/api/:version/users/:id" },
        { module: "PostModule", path: "/api/:version/posts/*" },
      ]);
    });

    it("should handle multiple slashes", () => {
      const routes = [
        {
          path: "//api//",
          children: [{ module: "UserModule", path: "//users//" }],
        },
      ];

      const result = flattenRoutePaths(routes as unknown as RouteTree[]);

      expect(result).toEqual([{ module: "UserModule", path: "/api/users" }]);
    });

    it("should handle root paths", () => {
      const routes = [
        {
          path: "/",
          children: [
            { module: "HomeModule", path: "/" },
            { module: "UserModule", path: "/users" },
          ],
        },
      ];

      const result = flattenRoutePaths(routes as unknown as RouteTree[]);

      expect(result).toEqual([
        { module: "HomeModule", path: "/" },
        { module: "UserModule", path: "/users" },
      ]);
    });
  });

  describe("Integration scenarios", () => {
    it("should handle complex route exclusion scenario", () => {
      const excludedRoutes = [
        {
          path: "/health",
          requestMethod: HttpMethod.ALL,
          pathRegex: /^\/health\/?$/,
        },
        {
          path: "/api/auth/*",
          requestMethod: HttpMethod.POST,
          pathRegex: /^\/api\/auth\/.*\/?$/,
        },
        {
          path: "/users/:id",
          requestMethod: HttpMethod.DELETE,
          pathRegex: /^\/users\/[^/]+\/?$/,
        },
      ];

      // Should be excluded
      expect(isRouteExcluded(excludedRoutes, "/health")).toBe(true);
      expect(isRouteExcluded(excludedRoutes, "/health", HttpMethod.GET)).toBe(true);
      expect(isRouteExcluded(excludedRoutes, "/api/auth/login", HttpMethod.POST)).toBe(true);
      expect(isRouteExcluded(excludedRoutes, "/users/123", HttpMethod.DELETE)).toBe(true);

      // Should not be excluded
      expect(isRouteExcluded(excludedRoutes, "/api/auth/login", HttpMethod.GET)).toBe(false);
      expect(isRouteExcluded(excludedRoutes, "/users/123", HttpMethod.GET)).toBe(false);
      expect(isRouteExcluded(excludedRoutes, "/other/path")).toBe(false);
    });

    it("should handle complete route flattening scenario", () => {
      const complexRoutes = [
        {
          path: "/api",
          module: "ApiModule",
          children: [
            {
              path: "/v1",
              children: [
                { module: "UserV1Module", path: "/users" },
                { module: "PostV1Module", path: "/posts" },
              ],
            },
            {
              path: "/v2",
              children: [
                { module: "UserV2Module", path: "/users" },
                "DirectV2Module",
              ],
            },
          ],
        },
        { module: "HealthModule", path: "/health" },
        {
          path: "/admin",
          children: [
            "AdminDashboardModule",
            { module: "AdminUserModule", path: "/users" },
          ],
        },
      ];

      const flattened = flattenRoutePaths(complexRoutes as unknown as RouteTree[]);

      expect(flattened).toEqual([
        { module: "ApiModule", path: "/api" },
        { module: "UserV1Module", path: "/api/v1/users" },
        { module: "PostV1Module", path: "/api/v1/posts" },
        { path: "/api/v2", module: "DirectV2Module" },
        { module: "UserV2Module", path: "/api/v2/users" },
        { module: "HealthModule", path: "/health" },
        { path: "/admin", module: "AdminDashboardModule" },
        { module: "AdminUserModule", path: "/admin/users" },
      ]);
    });

    it("should verify isRequestMethodAll edge cases", () => {
      // Test all possible HttpMethod values
      const allMethods = [
        HttpMethod.GET,
        HttpMethod.POST, 
        HttpMethod.PUT,
        HttpMethod.DELETE,
        HttpMethod.PATCH,
        HttpMethod.OPTIONS,
        HttpMethod.HEAD,
        HttpMethod.ALL,
      ];

      allMethods.forEach(method => {
        if (method === HttpMethod.ALL) {
          expect(isRequestMethodAll(method)).toBe(true);
        } else {
          expect(isRequestMethodAll(method)).toBe(false);
        }
      });

      // Test numeric -1 equivalent
      expect(isRequestMethodAll(-1 as HttpMethod)).toBe(true);
    });
  });
});