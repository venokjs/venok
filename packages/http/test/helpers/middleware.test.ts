import type { Type } from "@venok/core";

import { describe, expect, it } from "bun:test";

import { assignToken, filterMiddleware, isMiddlewareClass, mapToClass, mapToExcludeRoute } from "~/helpers/middleware.helper.js";
import { HttpMethod } from "~/enums/method.enum.js";

describe("Middleware Helper", () => {
  describe("mapToExcludeRoute", () => {
    it("should map string routes to ExcludeRouteMetadata", () => {
      const routes = ["/users", "/posts"];
      const result = mapToExcludeRoute(routes);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        path: "/users",
        requestMethod: HttpMethod.ALL,
        pathRegex: expect.any(RegExp),
      });
      expect(result[1]).toEqual({
        path: "/posts",
        requestMethod: HttpMethod.ALL,
        pathRegex: expect.any(RegExp),
      });
    });

    it("should map RouteInfo objects to ExcludeRouteMetadata", () => {
      const routes = [
        { path: "/users", method: HttpMethod.GET },
        { path: "/posts", method: HttpMethod.POST },
      ];
      const result = mapToExcludeRoute(routes);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        path: "/users",
        requestMethod: HttpMethod.GET,
        pathRegex: expect.any(RegExp),
      });
      expect(result[1]).toEqual({
        path: "/posts",
        requestMethod: HttpMethod.POST,
        pathRegex: expect.any(RegExp),
      });
    });

    it("should handle mixed string and RouteInfo routes", () => {
      const routes = [
        "/public",
        { path: "/api/users", method: HttpMethod.DELETE },
      ];
      const result = mapToExcludeRoute(routes);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        path: "/public",
        requestMethod: HttpMethod.ALL,
        pathRegex: expect.any(RegExp),
      });
      expect(result[1]).toEqual({
        path: "/api/users",
        requestMethod: HttpMethod.DELETE,
        pathRegex: expect.any(RegExp),
      });
    });

    it("should add leading slash to paths", () => {
      const routes = ["users", "api/posts"];
      const result = mapToExcludeRoute(routes);

      expect(result[0].path).toBe("users");
      expect(result[0].pathRegex.test("/users")).toBe(true);
      expect(result[1].path).toBe("api/posts");
      expect(result[1].pathRegex.test("/api/posts")).toBe(true);
    });

    it("should handle empty array", () => {
      const result = mapToExcludeRoute([]);
      expect(result).toEqual([]);
    });

    it("should handle complex path patterns", () => {
      const routes = [
        "/users/:id",
        { path: "/posts/files", method: HttpMethod.GET },
      ];
      const result = mapToExcludeRoute(routes);

      expect(result[0].pathRegex.test("/users/123")).toBe(true);
      expect(result[1].pathRegex.test("/posts/files")).toBe(true);
    });

    it("should preserve all HTTP methods", () => {
      const routes = [
        { path: "/get", method: HttpMethod.GET },
        { path: "/post", method: HttpMethod.POST },
        { path: "/put", method: HttpMethod.PUT },
        { path: "/delete", method: HttpMethod.DELETE },
        { path: "/patch", method: HttpMethod.PATCH },
        { path: "/all", method: HttpMethod.ALL },
      ];
      const result = mapToExcludeRoute(routes);

      expect(result[0].requestMethod).toBe(HttpMethod.GET);
      expect(result[1].requestMethod).toBe(HttpMethod.POST);
      expect(result[2].requestMethod).toBe(HttpMethod.PUT);
      expect(result[3].requestMethod).toBe(HttpMethod.DELETE);
      expect(result[4].requestMethod).toBe(HttpMethod.PATCH);
      expect(result[5].requestMethod).toBe(HttpMethod.ALL);
    });
  });

  describe("filterMiddleware", () => {
    it("should filter out non-function middleware", () => {
      const middleware = [
        () => {},
        class TestMiddleware {},
        "not a function",
        123,
        null,
        undefined,
        () => "another function",
      ] as Type[];

      const result = filterMiddleware(middleware);

      expect(result).toHaveLength(3); // Only the 3 functions/classes
      expect(typeof result[0]).toBe("function");
      expect(typeof result[1]).toBe("function");
      expect(typeof result[2]).toBe("function");
    });

    it("should map all middleware to classes", () => {
      const functionMiddleware = () => {};
      class ClassMiddleware {}
      const middleware = [functionMiddleware, ClassMiddleware];

      const result = filterMiddleware(middleware);

      expect(result).toHaveLength(2);
      // Both should be converted to classes
      expect(typeof result[0]).toBe("function");
      expect(typeof result[1]).toBe("function");
    });

    it("should handle empty array", () => {
      const result = filterMiddleware([]);
      expect(result).toEqual([]);
    });

    it("should handle array with only non-functions", () => {
      const middleware = ["string", 123, {}, null, undefined];
      // @ts-expect-error Mismatch types
      const result = filterMiddleware(middleware);
      expect(result).toEqual([]);
    });

    it("should handle array with only functions", () => {
      const middleware = [
        () => {},
        function named() {},
        class TestClass {},
      ];
      const result = filterMiddleware(middleware);
      expect(result).toHaveLength(3);
    });
  });

  describe("mapToClass", () => {
    it("should wrap function middleware in class", () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const functionMiddleware = (req: any, res: any, next: any) => {
        return "middleware result";
      };

      const result = mapToClass(functionMiddleware);

      expect(typeof result).toBe("function");
      
      const instance = new result();
      expect(typeof instance.use).toBe("function");
      expect(instance.use("arg1", "arg2", "arg3")).toBe("middleware result");
    });

    it("should return class middleware unchanged if it's already a class", () => {
      class ExistingMiddleware {
        use() {
          return "existing middleware";
        }
      }

      const result = mapToClass(ExistingMiddleware);
      expect(result).toBe(ExistingMiddleware);
    });

    it("should handle arrow functions", () => {
      const arrowMiddleware = () => "arrow function result";
      const result = mapToClass(arrowMiddleware);

      const instance = new result();
      expect(instance.use()).toBe("arrow function result");
    });

    it("should handle async functions", () => {
      const asyncMiddleware = async () => "async result";
      const result = mapToClass(asyncMiddleware);

      const instance = new result();
      expect(instance.use()).toBeInstanceOf(Promise);
    });

    it("should preserve function parameters", () => {
      const middlewareWithParams = (a: number, b: string) => `${a}-${b}`;
      const result = mapToClass(middlewareWithParams);

      const instance = new result();
      expect(instance.use(123, "test")).toBe("123-test");
    });

    it("should assign unique token to wrapped function", () => {
      const middleware1 = () => {};
      const middleware2 = () => {};

      const result1 = mapToClass(middleware1);
      const result2 = mapToClass(middleware2);

      expect(result1.name).toBeDefined();
      expect(result2.name).toBeDefined();
      expect(result1.name).not.toBe(result2.name);
    });
  });

  describe("isMiddlewareClass", () => {
    it("should return true for ES6 classes", () => {
      class TestMiddleware {
        use() {}
      }

      expect(isMiddlewareClass(TestMiddleware)).toBe(true);
    });

    it("should return true for function constructors with use prototype", () => {
      function TestMiddleware() {}
      TestMiddleware.prototype.use = function () {};

      expect(isMiddlewareClass(TestMiddleware)).toBe(true);
    });

    it("should return true for capitalized function with use prototype", () => {
      function CapitalizedMiddleware() {}
      CapitalizedMiddleware.prototype.use = function () {};

      expect(isMiddlewareClass(CapitalizedMiddleware)).toBe(true);
    });

    it("should return false for lowercase function names", () => {
      function lowercaseFunction() {}
      lowercaseFunction.prototype.use = function () {};

      expect(isMiddlewareClass(lowercaseFunction)).toBe(false);
    });

    it("should return false for functions without use prototype", () => {
      function TestMiddleware() {}

      expect(isMiddlewareClass(TestMiddleware)).toBe(false);
    });

    it("should return false for arrow functions", () => {
      const arrowFunction = () => {};

      expect(isMiddlewareClass(arrowFunction)).toBe(false);
    });

    it("should return false for regular functions", () => {
      function regularFunction() {}

      expect(isMiddlewareClass(regularFunction)).toBe(false);
    });

    it("should handle non-function inputs", () => {
      expect(isMiddlewareClass("string")).toBe(false);
      expect(isMiddlewareClass(123)).toBe(false);
      expect(isMiddlewareClass({})).toBe(false);
      
      // These will throw TypeError due to toString() call on null/undefined
      expect(() => isMiddlewareClass(null)).toThrow(TypeError);
      expect(() => isMiddlewareClass(undefined)).toThrow(TypeError);
    });

    it("should handle edge cases in function detection", () => {
      // Function with spaces in toString
      function SpacedFunction() {}
      SpacedFunction.prototype.use = function () {};

      expect(isMiddlewareClass(SpacedFunction)).toBe(true);
    });

    it("should return true for ES6 classes even without use method", () => {
      // Note: Current implementation returns true for any ES6 class
      // regardless of whether it has a use method
      class TestClass {
        someOtherMethod() {}
      }

      expect(isMiddlewareClass(TestClass)).toBe(true);
    });

    it("should handle functions with use property that's not a function", () => {
      function TestMiddleware() {}
      TestMiddleware.prototype.use = "not a function";

      expect(isMiddlewareClass(TestMiddleware)).toBe(false);
    });
  });

  describe("assignToken", () => {
    it("should assign token to class name", () => {
      class TestClass {}
      const token = "custom-token-123";

      const result = assignToken(TestClass, token);

      expect(result).toBe(TestClass);
      expect(result.name).toBe(token);
    });

    it("should generate token if not provided", () => {
      class TestClass {}
      const originalName = TestClass.name;

      const result = assignToken(TestClass);

      expect(result).toBe(TestClass);
      expect(result.name).toBeDefined();
      expect(result.name).not.toBe(originalName);
      expect(result.name).toHaveLength(21); // uid(21) generates 21 character strings
    });

    it("should handle function constructors", () => {
      function TestFunction() {}
      const token = "func-token";

      // @ts-expect-error Mismatch types
      const result = assignToken(TestFunction, token);

      // @ts-expect-error Mismatch types
      expect(result).toBe(TestFunction);
      expect(result.name).toBe(token);
    });

    it("should generate unique tokens when called multiple times", () => {
      class TestClass1 {}
      class TestClass2 {}

      const result1 = assignToken(TestClass1);
      const result2 = assignToken(TestClass2);

      expect(result1.name).toBeDefined();
      expect(result2.name).toBeDefined();
      expect(result1.name).not.toBe(result2.name);
    });

    it("should handle empty string token", () => {
      class TestClass {}

      const result = assignToken(TestClass, "");

      expect(result.name).toBe("");
    });

    it("should handle special characters in token", () => {
      class TestClass {}
      const specialToken = "test-token_123!@#";

      const result = assignToken(TestClass, specialToken);

      expect(result.name).toBe(specialToken);
    });

    it("should preserve class functionality after token assignment", () => {
      class TestClass {
        getValue() {
          return "test value";
        }
      }

      const result = assignToken(TestClass, "new-name");
      const instance = new result();

      expect(instance.getValue()).toBe("test value");
      expect(instance).toBeInstanceOf(TestClass);
    });
  });

  describe("Integration scenarios", () => {
    it("should handle complete middleware processing pipeline", () => {
      // Mixed middleware types
      const middleware = [
        // Function middleware
        () => "function middleware",
        
        // Class middleware
        class AuthMiddleware {
          use() {
            return "auth middleware";
          }
        },
        
        // Invalid middleware (will be filtered out)
        "invalid",
        123,
        
        // Another function
        () => "another function",
      ] as Type[];

      // Process middleware
      const filtered = filterMiddleware(middleware);
      
      expect(filtered).toHaveLength(3);
      
      // Test that all are now classes with use methods
      filtered.forEach(MiddlewareClass => {
        const instance = new MiddlewareClass();
        expect(typeof instance.use).toBe("function");
      });
    });

    it("should handle route exclusion for complex patterns", () => {
      const routes = [
        "/health",
        "/metrics", 
        { path: "/api/auth/login", method: HttpMethod.POST },
        { path: "/api/users/:id", method: HttpMethod.GET },
      ];

      const excludeRoutes = mapToExcludeRoute(routes);
      
      // Verify all routes are properly converted
      expect(excludeRoutes).toHaveLength(4);
      
      // Test regex functionality
      expect(excludeRoutes[0].pathRegex.test("/health")).toBe(true);
      expect(excludeRoutes[1].pathRegex.test("/metrics")).toBe(true);
      expect(excludeRoutes[2].pathRegex.test("/api/auth/login")).toBe(true);
      expect(excludeRoutes[3].pathRegex.test("/api/users/123")).toBe(true);
    });

    it("should handle middleware class detection edge cases", () => {
      // Various middleware types that should be detected as classes
      const validClasses = [
        class ValidMiddleware { use() {} },
        
        // Function constructor style
        function ValidConstructor() {},
      ];

      // Add use method to function constructor
      validClasses[1].prototype.use = function () {};

      validClasses.forEach(middleware => {
        expect(isMiddlewareClass(middleware)).toBe(true);
      });

      // Invalid cases - most return false, except ES6 classes always return true
      expect(isMiddlewareClass(() => {})).toBe(false); // Arrow function
      expect(isMiddlewareClass(function invalidName() {})).toBe(false); // Lowercase name
      expect(isMiddlewareClass(class NoUseMethod {})).toBe(true); // ES6 class always returns true
      expect(isMiddlewareClass("not a function")).toBe(false);
    });
  });
});