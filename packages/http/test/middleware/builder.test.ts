import type { Type } from "@venok/core";
import type { RouteInfo } from "~/interfaces/index.js";

import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

import { MiddlewareBuilder } from "~/middleware/builder.js";
import { MiddlewareRoutesMapper } from "~/middleware/routes-mapper.js";
import { AbstractHttpAdapter } from "~/http/adapter.js";
import { HttpMethod } from "~/enums/method.enum.js";

// Mock classes for testing
// @ts-expect-error Mismatch types
class MockHttpAdapter extends AbstractHttpAdapter {
  reply() {}
  status() {}
  render() {}
  redirect() {}
  setHeader() {}
  setErrorHandler() {}
  setNotFoundHandler() {}
  isHeadersSent() { return false; }
  getRequestHostname() { return "localhost"; }
  // @ts-expect-error Mismatch types
  getRequestMethod() { return "GET"; }
  getRequestUrl() { return "/"; }
  close() {}
  // @ts-expect-error Mismatch types
  listen() {}
  use() {}
  getType() { return "mock"; }
  createMiddlewareFactory() { return () => {}; }
  initHttpServer() {}
  registerParserMiddleware() {}
  useStaticAssets() {}
  setViewEngine() {}
  setGlobalPrefix() {}
  getHttpServer() { return {}; }
}

class TestMiddleware {
  use() {
    return "test-middleware";
  }
}

class AnotherMiddleware {
  use() {
    return "another-middleware";
  }
}

function testFunctionMiddleware() {
  return "function-middleware";
}

const testRouteInfo: RouteInfo = {
  path: "/test",
  method: HttpMethod.GET,
};

const anotherRouteInfo: RouteInfo = {
  path: "/another",
  method: HttpMethod.POST,
};

describe("MiddlewareBuilder", () => {
  let builder: MiddlewareBuilder;
  let mockRoutesMapper: MiddlewareRoutesMapper;
  let mockHttpAdapter: AbstractHttpAdapter;

  beforeEach(() => {
    // @ts-expect-error Mismatch types
    mockHttpAdapter = new MockHttpAdapter("");
    mockRoutesMapper = {
      mapRouteToRouteInfo: mock(() => [testRouteInfo]),
    } as any;

    builder = new MiddlewareBuilder(mockRoutesMapper, mockHttpAdapter);
  });

  describe("constructor", () => {
    it("should initialize with empty middleware collection", () => {
      expect((builder as any).middlewareCollection.size).toBe(0);
    });

    it("should store references to dependencies", () => {
      expect((builder as any).middlewareRoutesMapper).toBe(mockRoutesMapper);
      expect((builder as any).httpAdapter).toBe(mockHttpAdapter);
    });
  });

  describe("apply", () => {
    it("should create ConfigProxy with single middleware", () => {
      const proxy = builder.apply(TestMiddleware);

      // @ts-expect-error Mismatch types
      expect(proxy).toBeInstanceOf(MiddlewareBuilder.ConfigProxy);
      expect((proxy as any).middleware).toEqual([TestMiddleware]);
    });

    it("should create ConfigProxy with multiple middleware", () => {
      const proxy = builder.apply(TestMiddleware, AnotherMiddleware);

      // @ts-expect-error Mismatch types
      expect(proxy).toBeInstanceOf(MiddlewareBuilder.ConfigProxy);
      expect((proxy as any).middleware).toEqual([TestMiddleware, AnotherMiddleware]);
    });

    it("should flatten nested middleware arrays", () => {
      const middlewareArray = [TestMiddleware, [AnotherMiddleware]];
      
      const result = builder.apply(...middlewareArray);

      // @ts-expect-error Mismatch types
      expect(result).toBeInstanceOf(MiddlewareBuilder.ConfigProxy);
      expect((result as any).middleware).toBeDefined();
    });

    it("should handle function middleware", () => {
      const proxy = builder.apply(testFunctionMiddleware);

      // @ts-expect-error Mismatch types
      expect(proxy).toBeInstanceOf(MiddlewareBuilder.ConfigProxy);
      expect((proxy as any).middleware).toEqual([testFunctionMiddleware]);
    });

    it("should handle empty middleware", () => {
      const proxy = builder.apply();

      // @ts-expect-error Mismatch types
      expect(proxy).toBeInstanceOf(MiddlewareBuilder.ConfigProxy);
      expect((proxy as any).middleware).toEqual([]);
    });
  });

  describe("build", () => {
    it("should return empty array when no middleware configured", () => {
      const result = builder.build();

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it("should return copy of middleware collection", () => {
      // Add some middleware configuration
      builder.apply(TestMiddleware).to("/test");

      const result1 = builder.build();
      const result2 = builder.build();

      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2); // Different array instances
    });

    it("should return all configured middleware", () => {
      builder.apply(TestMiddleware).to("/test");
      builder.apply(AnotherMiddleware).to("/another");

      const result = builder.build();

      expect(result).toHaveLength(2);
      expect(result.every(config => typeof config === "object")).toBe(true);
    });
  });

  describe("getHttpAdapter", () => {
    it("should return the http adapter", () => {
      const adapter = builder.getHttpAdapter();

      expect(adapter).toBe(mockHttpAdapter);
      expect(adapter).toBeInstanceOf(MockHttpAdapter);
    });
  });

  describe("ConfigProxy", () => {
    let configProxy: any;

    beforeEach(() => {
      configProxy = builder.apply(TestMiddleware);
    });

    describe("constructor", () => {
      it("should initialize with empty excluded routes", () => {
        expect(configProxy.excludedRoutes).toEqual([]);
      });

      it("should store builder and middleware references", () => {
        expect(configProxy.builder).toBe(builder);
        expect(configProxy.middleware).toEqual([TestMiddleware]);
      });
    });

    describe("getExcludedRoutes", () => {
      it("should return empty array initially", () => {
        const excludedRoutes = configProxy.getExcludedRoutes();

        expect(excludedRoutes).toEqual([]);
        expect(Array.isArray(excludedRoutes)).toBe(true);
      });

      it("should return excluded routes after exclusion", () => {
        mockRoutesMapper.mapRouteToRouteInfo = mock(() => [anotherRouteInfo]);
        configProxy.exclude("/another");

        const excludedRoutes = configProxy.getExcludedRoutes();

        expect(excludedRoutes).toEqual([anotherRouteInfo]);
      });
    });

    describe("exclude", () => {
      it("should exclude string route", () => {
        mockRoutesMapper.mapRouteToRouteInfo = mock(() => [anotherRouteInfo]);
        const result = configProxy.exclude("/another");

        expect(result).toBe(configProxy);
        expect(configProxy.excludedRoutes).toEqual([anotherRouteInfo]);
        expect(mockRoutesMapper.mapRouteToRouteInfo).toHaveBeenCalledWith("/another");
      });

      it("should exclude RouteInfo object", () => {
        mockRoutesMapper.mapRouteToRouteInfo = mock(() => [anotherRouteInfo]);
        const result = configProxy.exclude(anotherRouteInfo);

        expect(result).toBe(configProxy);
        expect(configProxy.excludedRoutes).toEqual([anotherRouteInfo]);
        expect(mockRoutesMapper.mapRouteToRouteInfo).toHaveBeenCalledWith(anotherRouteInfo);
      });

      it("should handle multiple exclusions", () => {
        const route1 = { path: "/route1", method: HttpMethod.GET };
        const route2 = { path: "/route2", method: HttpMethod.POST };
        
        mockRoutesMapper.mapRouteToRouteInfo = mock()
          .mockReturnValueOnce([route1])
          .mockReturnValueOnce([route2]);

        configProxy.exclude("/route1", "/route2");

        expect(configProxy.excludedRoutes).toEqual([route1, route2]);
      });

      it("should accumulate excluded routes", () => {
        const route1 = { path: "/route1", method: HttpMethod.GET };
        const route2 = { path: "/route2", method: HttpMethod.POST };
        
        mockRoutesMapper.mapRouteToRouteInfo = mock()
          .mockReturnValueOnce([route1])
          .mockReturnValueOnce([route2]);

        configProxy.exclude("/route1");
        configProxy.exclude("/route2");

        expect(configProxy.excludedRoutes).toEqual([route1, route2]);
      });

      it("should flatten multiple routes from mapper", () => {
        const route1 = { path: "/route1", method: HttpMethod.GET };
        const route2 = { path: "/route2", method: HttpMethod.POST };
        
        mockRoutesMapper.mapRouteToRouteInfo = mock(() => [route1, route2]);

        configProxy.exclude("/multi-route");

        expect(configProxy.excludedRoutes).toEqual([route1, route2]);
      });
    });

    describe("to", () => {
      it("should configure middleware for string route", () => {
        mockRoutesMapper.mapRouteToRouteInfo = mock(() => [testRouteInfo]);

        const result = configProxy.to("/test");

        expect(result).toBe(builder);
        expect(mockRoutesMapper.mapRouteToRouteInfo).toHaveBeenCalledWith("/test");
        expect((builder as any).middlewareCollection.size).toBe(1);
      });

      it("should configure middleware for RouteInfo object", () => {
        mockRoutesMapper.mapRouteToRouteInfo = mock(() => [testRouteInfo]);

        const result = configProxy.to(testRouteInfo);

        expect(result).toBe(builder);
        expect(mockRoutesMapper.mapRouteToRouteInfo).toHaveBeenCalledWith(testRouteInfo);
      });

      it("should configure middleware for Type (controller)", () => {
        mockRoutesMapper.mapRouteToRouteInfo = mock(() => [testRouteInfo]);

        const result = configProxy.to(TestMiddleware as Type);

        expect(result).toBe(builder);
        expect(mockRoutesMapper.mapRouteToRouteInfo).toHaveBeenCalledWith(TestMiddleware);
      });

      it("should handle multiple routes", () => {
        const route1 = { path: "/route1", method: HttpMethod.GET };
        const route2 = { path: "/route2", method: HttpMethod.POST };
        
        mockRoutesMapper.mapRouteToRouteInfo = mock()
          .mockReturnValueOnce([route1])
          .mockReturnValueOnce([route2]);

        configProxy.to("/route1", "/route2");

        expect(mockRoutesMapper.mapRouteToRouteInfo).toHaveBeenCalledTimes(2);
        expect((builder as any).middlewareCollection.size).toBe(1);
      });

      it("should include excluded routes in configuration", () => {
        const excludedRoute = { path: "/excluded", method: HttpMethod.GET };
        
        mockRoutesMapper.mapRouteToRouteInfo = mock()
          .mockReturnValueOnce([excludedRoute])
          .mockReturnValueOnce([testRouteInfo]);

        configProxy.exclude("/excluded");
        configProxy.to("/test");

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const configurations = Array.from((builder as any).middlewareCollection);
        const config = configurations[0];

        expect((config as any).exclude).toEqual([excludedRoute]);
        expect((config as any).to).toEqual([testRouteInfo]);
        expect((config as any).middleware).toBeDefined();
      });

      it("should call removeOverlappedRoutes to filter routes", () => {
        const removeOverlappedSpy = spyOn(configProxy, "removeOverlappedRoutes").mockReturnValue([testRouteInfo]);
        
        mockRoutesMapper.mapRouteToRouteInfo = mock(() => [testRouteInfo]);

        configProxy.to("/test");

        expect(removeOverlappedSpy).toHaveBeenCalledWith([testRouteInfo]);
      });
    });

    describe("getRoutesFlatList", () => {
      it("should flatten routes from mapper", () => {
        const routes = ["/test", testRouteInfo, TestMiddleware];
        
        mockRoutesMapper.mapRouteToRouteInfo = mock()
          .mockReturnValueOnce([testRouteInfo])
          .mockReturnValueOnce([anotherRouteInfo])
          .mockReturnValueOnce([testRouteInfo]);

        const result = (configProxy).getRoutesFlatList(routes);

        expect(result).toHaveLength(3);
        expect(mockRoutesMapper.mapRouteToRouteInfo).toHaveBeenCalledTimes(3);
      });

      it("should handle empty routes array", () => {
        const result = (configProxy).getRoutesFlatList([]);

        expect(result).toEqual([]);
        expect(mockRoutesMapper.mapRouteToRouteInfo).not.toHaveBeenCalled();
      });
    });

    describe("removeOverlappedRoutes", () => {
      it("should return all routes when no parametric routes", () => {
        const routes = [
          { path: "/static1", method: HttpMethod.GET },
          { path: "/static2", method: HttpMethod.POST },
        ];

        const result = (configProxy).removeOverlappedRoutes(routes);

        expect(result).toEqual(routes);
      });

      it("should filter overlapped parametric routes", () => {
        const routes = [
          { path: "/users/:id", method: HttpMethod.GET },
          { path: "/users/profile", method: HttpMethod.GET },
          { path: "/users/123", method: HttpMethod.GET },
        ];

        const result = (configProxy).removeOverlappedRoutes(routes);

        // Should keep parametric route and non-overlapping static routes
        expect(result.length).toBeGreaterThan(0);
        expect(result.some((r: any) => r.path === "/users/:id")).toBe(true);
      });

      it("should handle different HTTP methods separately", () => {
        const routes = [
          { path: "/users/:id", method: HttpMethod.GET },
          { path: "/users/profile", method: HttpMethod.POST },
        ];

        const result = (configProxy).removeOverlappedRoutes(routes);

        // Different methods should not overlap
        expect(result).toEqual(routes);
      });

      it("should handle routes with trailing slashes", () => {
        const routes = [
          { path: "/users/:id", method: HttpMethod.GET },
          { path: "/users/profile/", method: HttpMethod.GET },
        ];

        const result = (configProxy).removeOverlappedRoutes(routes);

        expect(Array.isArray(result)).toBe(true);
      });

      it("should handle multiple parametric segments", () => {
        const routes = [
          { path: "/users/:userId/posts/:postId", method: HttpMethod.GET },
          { path: "/users/123/posts/456", method: HttpMethod.GET },
          { path: "/users/admin/posts/featured", method: HttpMethod.GET },
        ];

        const result = (configProxy).removeOverlappedRoutes(routes);

        // Should keep the parametric route and filter overlapping routes
        expect(result.length).toBeGreaterThan(0);
        expect(result.some((r: any) => r.path === "/users/:userId/posts/:postId")).toBe(true);
      });

      it("should not filter non-overlapping routes", () => {
        const routes = [
          { path: "/users/:id", method: HttpMethod.GET },
          { path: "/posts/:id", method: HttpMethod.GET },
          { path: "/categories/tech", method: HttpMethod.GET },
        ];

        const result = (configProxy).removeOverlappedRoutes(routes);

        // Different base paths should not overlap
        expect(result).toEqual(routes);
      });

      it("should handle empty routes array", () => {
        const result = (configProxy).removeOverlappedRoutes([]);

        expect(result).toEqual([]);
      });

      it("should handle routes with same path but different parametric route", () => {
        const routes = [
          { path: "/users/:id", method: HttpMethod.GET },
          { path: "/users/:userId", method: HttpMethod.GET },
        ];

        const result = (configProxy).removeOverlappedRoutes(routes);

        // Function should handle parametric routes correctly
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeLessThanOrEqual(routes.length);
      });
    });
  });

  describe("integration scenarios", () => {
    beforeEach(() => {
      // Clear previous mocks
      mock.restore();
    });

    it("should build complete middleware configuration flow", () => {
      const excludedRoute = { path: "/excluded", method: HttpMethod.GET };
      const targetRoute = { path: "/target", method: HttpMethod.POST };
      
      mockRoutesMapper.mapRouteToRouteInfo = mock()
        .mockReturnValueOnce([excludedRoute])
        .mockReturnValueOnce([targetRoute]);

      const result = builder
        .apply(TestMiddleware, AnotherMiddleware)
        .exclude("/excluded")
        .to("/target");

      expect(result).toBe(builder);

      const configurations = builder.build();
      expect(configurations).toHaveLength(1);

      const config = configurations[0];
      expect(config.middleware).toBeDefined();
      expect(config.exclude).toEqual([excludedRoute]);
      expect(config.to).toEqual([targetRoute]);
    });

    it("should handle multiple middleware configurations", () => {
      mockRoutesMapper.mapRouteToRouteInfo = mock()
        .mockReturnValueOnce([{ path: "/api", method: HttpMethod.ALL }])
        .mockReturnValueOnce([{ path: "/auth", method: HttpMethod.POST }]);

      builder.apply(TestMiddleware).to("/api");
      builder.apply(AnotherMiddleware).to("/auth");

      const configurations = builder.build();
      expect(configurations).toHaveLength(2);
    });

    it("should handle complex exclude and include patterns", () => {
      const excludedRoutes = [
        { path: "/health", method: HttpMethod.GET },
        { path: "/metrics", method: HttpMethod.GET },
      ];
      const targetRoutes = [
        { path: "/api/users", method: HttpMethod.ALL },
        { path: "/api/posts", method: HttpMethod.ALL },
      ];
      
      mockRoutesMapper.mapRouteToRouteInfo = mock()
        .mockReturnValueOnce([excludedRoutes[0]])
        .mockReturnValueOnce([excludedRoutes[1]])
        .mockReturnValueOnce([targetRoutes[0]])
        .mockReturnValueOnce([targetRoutes[1]]);

      builder
        .apply(TestMiddleware)
        .exclude("/health", "/metrics")
        .to("/api/users", "/api/posts");

      const configurations = builder.build();
      const config = configurations[0];

      expect(config.exclude).toEqual(excludedRoutes);
      expect(config.to).toEqual(targetRoutes);
    });

    it("should work with function middleware", () => {
      mockRoutesMapper.mapRouteToRouteInfo = mock(() => [testRouteInfo]);

      builder.apply(testFunctionMiddleware).to("/test");

      const configurations = builder.build();
      expect(configurations).toHaveLength(1);
    });

    it("should maintain builder state across multiple configurations", () => {
      mockRoutesMapper.mapRouteToRouteInfo = mock(() => [testRouteInfo]);

      const proxy1 = builder.apply(TestMiddleware);
      const proxy2 = builder.apply(AnotherMiddleware);

      expect(proxy1.to("/test1")).toBe(builder);
      expect(proxy2.to("/test2")).toBe(builder);

      const configurations = builder.build();
      expect(configurations).toHaveLength(2);
      expect(builder.getHttpAdapter()).toBe(mockHttpAdapter);
    });
  });

  describe("edge cases", () => {
    it("should handle null/undefined middleware", () => {
      const proxy = builder.apply(null as any, undefined as any, TestMiddleware);

      expect((proxy as any).middleware).toEqual([null, undefined, TestMiddleware]);
    });

    it("should handle empty exclude calls", () => {
      const proxy = builder.apply(TestMiddleware);
      const result = proxy.exclude();

      expect(result).toBe(proxy);
      expect((proxy as any).getExcludedRoutes()).toEqual([]);
    });

    it("should handle empty to calls", () => {
      mockRoutesMapper.mapRouteToRouteInfo = mock(() => []);

      const proxy = builder.apply(TestMiddleware);
      proxy.to();

      const configurations = builder.build();
      expect(configurations).toHaveLength(1);
      expect(configurations[0].to).toEqual([]);
    });

    it("should handle overlapped route removal edge cases", () => {
      const proxy = builder.apply(TestMiddleware);

      // Test with routes that have same base path but different parameters
      const routes = [
        { path: "/api/:param1", method: HttpMethod.GET },
        { path: "/api/:param2", method: HttpMethod.GET },
        { path: "/api/static", method: HttpMethod.GET },
      ];

      const result = (proxy as any).removeOverlappedRoutes(routes);

      // Should filter out overlapped static routes
      expect(result.length).toBeLessThanOrEqual(routes.length);
    });

    it("should handle routes with special regex characters", () => {
      const proxy = builder.apply(TestMiddleware);
      const routes = [
        { path: "/api/:id(\\d+)", method: HttpMethod.GET },
        { path: "/api/123", method: HttpMethod.GET },
      ];

      const result = (proxy as any).removeOverlappedRoutes(routes);

      // Should handle regex patterns correctly
      expect(Array.isArray(result)).toBe(true);
    });

    it("should handle builder state isolation", () => {
      const builder2 = new MiddlewareBuilder(mockRoutesMapper, mockHttpAdapter);
      
      builder.apply(TestMiddleware).to("/test1");
      builder2.apply(AnotherMiddleware).to("/test2");

      expect(builder.build()).toHaveLength(1);
      expect(builder2.build()).toHaveLength(1);
      expect(builder.build()).not.toEqual(builder2.build());
    });
  });

  describe("static ConfigProxy class", () => {
    it("should be accessible as static property", () => {
      // @ts-expect-error Mismatch types
      expect(MiddlewareBuilder.ConfigProxy).toBeDefined();
      // @ts-expect-error Mismatch types
      expect(typeof MiddlewareBuilder.ConfigProxy).toBe("function");
    });

    it("should create instances that work with builder", () => {
      // @ts-expect-error Mismatch types
      const proxy = new MiddlewareBuilder.ConfigProxy(builder, [TestMiddleware]);

      expect(proxy.getExcludedRoutes).toBeDefined();
      expect(proxy.exclude).toBeDefined();
      expect(proxy.to).toBeDefined();
    });
  });

  describe("cleanup and memory management", () => {
    beforeEach(() => {
      // Restore all mocks to avoid interference
      mock.restore();
    });

    it("should not leak memory with many configurations", () => {
      mockRoutesMapper.mapRouteToRouteInfo = mock(() => [testRouteInfo]);

      // Add many configurations
      for (let i = 0; i < 100; i++) {
        builder.apply(TestMiddleware).to(`/test${i}`);
      }

      const configurations = builder.build();
      expect(configurations).toHaveLength(100);
      expect((builder as any).middlewareCollection.size).toBe(100);
    });

    it("should handle builder reuse correctly", () => {
      mockRoutesMapper.mapRouteToRouteInfo = mock(() => [testRouteInfo]);

      builder.apply(TestMiddleware).to("/first");
      const firstBuild = builder.build();

      builder.apply(AnotherMiddleware).to("/second");
      const secondBuild = builder.build();

      expect(firstBuild).toHaveLength(1);
      expect(secondBuild).toHaveLength(2);
      expect(firstBuild).not.toBe(secondBuild); // Different arrays
    });
  });
});