import type { ControllerDiscovery } from "~/helpers/discovery.helper.js";
import type { RouteInfo } from "~/interfaces/index.js";

import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { CoreModule, MODULE_PATH, Reflector, VenokContainer } from "@venok/core";

import { MiddlewareRoutesMapper } from "~/middleware/routes-mapper.js";
import { HttpConfig } from "~/http/config.js";
import { RoutePathFactory } from "~/router/path-factory.js";
import { RouteFinder } from "~/router/finder.js";
import { HttpMethod } from "~/enums/method.enum.js";
import { Controller } from "~/decorators/controller.decorator.js";
import { targetModulesByContainer } from "~/router/module.js";
import { HttpVersioningType } from "~/enums/version-type.enum.js";

@Controller("/")
class TestController {}

class TestModule {}

describe("MiddlewareRoutesMapper", () => {
  let mapper: MiddlewareRoutesMapper;
  let mockContainer: VenokContainer;
  let mockHttpConfig: HttpConfig;
  let mockRouteFinder: RouteFinder;
  let mockRoutePathFactory: RoutePathFactory;

  beforeEach(() => {
    mockContainer = new VenokContainer();
    mockHttpConfig = {
      getGlobalPrefix: mock(() => ""),
      getVersioning: mock(() => undefined),
    } as any;

    mapper = new MiddlewareRoutesMapper(mockContainer, mockHttpConfig);

    mockRouteFinder = (mapper as any).routeFinder;
    mockRoutePathFactory = (mapper as any).routePathFactory;
  });

  describe("constructor", () => {
    it("should initialize with container and http config", () => {
      expect((mapper as any).container).toBe(mockContainer);
      expect((mapper as any).httpConfig).toBe(mockHttpConfig);
      expect((mapper as any).routeFinder).toBeInstanceOf(RouteFinder);
      expect((mapper as any).routePathFactory).toBeInstanceOf(RoutePathFactory);
    });

    it("should create RouteFinder with MetadataScanner", () => {
      const newMapper = new MiddlewareRoutesMapper(mockContainer, mockHttpConfig);
      expect((newMapper as any).routeFinder).toBeInstanceOf(RouteFinder);
    });

    it("should create RoutePathFactory with httpConfig", () => {
      const newMapper = new MiddlewareRoutesMapper(mockContainer, mockHttpConfig);
      expect((newMapper as any).routePathFactory).toBeInstanceOf(RoutePathFactory);
    });
  });

  describe("mapRouteToRouteInfo", () => {
    describe("when controllerOrRoute is string", () => {
      it("should call getRouteInfoFromPath", () => {
        const getRouteInfoFromPathSpy = spyOn(mapper as any, "getRouteInfoFromPath").mockReturnValue([]);
        const result = mapper.mapRouteToRouteInfo("/test");
        expect(getRouteInfoFromPathSpy).toHaveBeenCalledWith("/test");
        expect(result).toEqual([]);
      });

      it("should handle empty string path", () => {
        const getRouteInfoFromPathSpy = spyOn(mapper as any, "getRouteInfoFromPath").mockReturnValue([]);
        mapper.mapRouteToRouteInfo("");
        expect(getRouteInfoFromPathSpy).toHaveBeenCalledWith("");
      });

      it("should handle complex path with parameters", () => {
        const getRouteInfoFromPathSpy = spyOn(mapper as any, "getRouteInfoFromPath").mockReturnValue([]);
        mapper.mapRouteToRouteInfo("/users/:id/posts/:postId");
        expect(getRouteInfoFromPathSpy).toHaveBeenCalledWith("/users/:id/posts/:postId");
      });
    });

    describe("when controllerOrRoute is RouteInfo", () => {
      it("should call getRouteInfoFromObject for RouteInfo", () => {
        const routeInfo: RouteInfo = { path: "/test", method: HttpMethod.GET };
        const getRouteInfoFromObjectSpy = spyOn(mapper as any, "getRouteInfoFromObject").mockReturnValue([routeInfo]);
        const result = mapper.mapRouteToRouteInfo(routeInfo);
        expect(getRouteInfoFromObjectSpy).toHaveBeenCalledWith(routeInfo);
        expect(result).toEqual([routeInfo]);
      });

      it("should handle RouteInfo with version", () => {
        const routeInfo: RouteInfo = { path: "/test", method: HttpMethod.POST, version: "1" };
        const getRouteInfoFromObjectSpy = spyOn(mapper as any, "getRouteInfoFromObject").mockReturnValue([routeInfo]);
        mapper.mapRouteToRouteInfo(routeInfo);
        expect(getRouteInfoFromObjectSpy).toHaveBeenCalledWith(routeInfo);
      });

      it("should handle RouteInfo with all HTTP methods", () => {
        Object.values(HttpMethod).forEach((method) => {
          if (typeof method === "number") {
            const routeInfo: RouteInfo = { path: "/test", method };
            const getRouteInfoFromObjectSpy = spyOn(mapper as any, "getRouteInfoFromObject").mockReturnValue([routeInfo]);
            mapper.mapRouteToRouteInfo(routeInfo);
            expect(getRouteInfoFromObjectSpy).toHaveBeenCalledWith(routeInfo);
            getRouteInfoFromObjectSpy.mockRestore();
          }
        });
      });
    });

    describe("when controllerOrRoute is Type (controller class)", () => {
      it("should call getRouteInfoFromController", () => {
        const getRouteInfoFromControllerSpy = spyOn(mapper as any, "getRouteInfoFromController").mockReturnValue([]);
        const result = mapper.mapRouteToRouteInfo(TestController);
        expect(getRouteInfoFromControllerSpy).toHaveBeenCalledWith(TestController);
        expect(result).toEqual([]);
      });

      it("should handle different controller types", () => {
        class AnotherController {}
        const getRouteInfoFromControllerSpy = spyOn(mapper as any, "getRouteInfoFromController").mockReturnValue([]);
        mapper.mapRouteToRouteInfo(AnotherController);
        expect(getRouteInfoFromControllerSpy).toHaveBeenCalledWith(AnotherController);
      });
    });
  });

  describe("isRouteInfo", () => {
    it("should return true for RouteInfo object", () => {
      const routeInfo: RouteInfo = { path: "/test", method: HttpMethod.GET };
      const result = (mapper as any).isRouteInfo(routeInfo);
      expect(result).toBe(true);
    });

    it("should return false for controller class", () => {
      const result = (mapper as any).isRouteInfo(TestController);
      expect(result).toBe(false);
    });

    it("should return true for object with path property", () => {
      const objectWithPath = { path: "/test", someOtherProperty: "value" };
      const result = (mapper as any).isRouteInfo(objectWithPath);
      expect(result).toBe(true);
    });

    it("should return false for object without path property", () => {
      const objectWithoutPath = { method: HttpMethod.GET, someOtherProperty: "value" };
      const result = (mapper as any).isRouteInfo(objectWithoutPath);
      expect(result).toBe(false);
    });

    it("should throw for null/undefined", () => {
      expect(() => (mapper as any).isRouteInfo(null)).toThrow();
      expect(() => (mapper as any).isRouteInfo(undefined)).toThrow();
    });
  });

  describe("getRouteInfoFromPath", () => {
    beforeEach(() => {
      spyOn(mockHttpConfig, "getGlobalPrefix").mockReturnValue("/api");
      spyOn(mockRoutePathFactory, "create").mockReturnValue(["/api/test"]);
    });

    it("should create route info with global prefix", () => {
      const result = (mapper as any).getRouteInfoFromPath("/test");
      expect(mockHttpConfig.getGlobalPrefix).toHaveBeenCalled();
      expect(mockRoutePathFactory.create).toHaveBeenCalledWith({
        methodPath: "/test",
        globalPrefix: "/api",
      });
      expect(result).toEqual([{ path: "/api/test", method: HttpMethod.ALL }]);
    });

    it("should handle empty global prefix", () => {
      spyOn(mockHttpConfig, "getGlobalPrefix").mockReturnValue("");
      spyOn(mockRoutePathFactory, "create").mockReturnValue(["/test"]);
      
      const result = (mapper as any).getRouteInfoFromPath("/test");
      expect(mockRoutePathFactory.create).toHaveBeenCalledWith({
        methodPath: "/test",
        globalPrefix: "",
      });
      expect(result).toEqual([{ path: "/test", method: HttpMethod.ALL }]);
    });

    it("should use HttpMethod.ALL for path-based routes", () => {
      const result = (mapper as any).getRouteInfoFromPath("/any-path");
      expect(result[0].method).toBe(HttpMethod.ALL);
    });

    it("should handle path without leading slash", () => {
      spyOn(mockRoutePathFactory, "create").mockReturnValue(["/api/test"]);
      (mapper as any).getRouteInfoFromPath("test");
      expect(mockRoutePathFactory.create).toHaveBeenCalledWith({
        methodPath: "test",
        globalPrefix: "/api",
      });
    });

    it("should handle complex paths", () => {
      spyOn(mockRoutePathFactory, "create").mockReturnValue(["/api/users/:id/posts"]);
      const result = (mapper as any).getRouteInfoFromPath("/users/:id/posts");
      expect(result).toEqual([{ path: "/api/users/:id/posts", method: HttpMethod.ALL }]);
    });
  });

  describe("getRouteInfoFromObject", () => {
    beforeEach(() => {
      spyOn(mockHttpConfig, "getGlobalPrefix").mockReturnValue("/api");
      spyOn(mockHttpConfig, "getVersioning").mockReturnValue({ type: HttpVersioningType.URI, prefix: "v" });
    });

    it("should create route info from RouteInfo object", () => {
      const routeInfo: RouteInfo = { path: "/users", method: HttpMethod.GET };
      spyOn(mockRoutePathFactory, "create").mockReturnValue(["/api/users"]);

      const result = (mapper as any).getRouteInfoFromObject(routeInfo);
      expect(mockRoutePathFactory.create).toHaveBeenCalledWith({
        methodPath: "/users",
        globalPrefix: "/api",
        versioningOptions: { type: HttpVersioningType.URI, prefix: "v" },
        methodVersion: undefined,
      });
      expect(result).toEqual([{ path: "/api/users", method: HttpMethod.GET }]);
    });

    it("should handle RouteInfo with version", () => {
      const routeInfo: RouteInfo = { path: "/users", method: HttpMethod.POST, version: "2" };
      spyOn(mockRoutePathFactory, "create").mockReturnValue(["/api/v2/users"]);

      const result = (mapper as any).getRouteInfoFromObject(routeInfo);
      expect(mockRoutePathFactory.create).toHaveBeenCalledWith({
        methodPath: "/users",
        globalPrefix: "/api",
        versioningOptions: { type: HttpVersioningType.URI, prefix: "v" },
        methodVersion: "2",
      });
      expect(result).toEqual([{ path: "/api/v2/users", method: HttpMethod.POST }]);
    });

    it("should handle multiple paths from factory", () => {
      const routeInfo: RouteInfo = { path: "/users", method: HttpMethod.GET, version: ["1", "2"] };
      spyOn(mockRoutePathFactory, "create").mockReturnValue(["/api/v1/users", "/api/v2/users"]);

      const result = (mapper as any).getRouteInfoFromObject(routeInfo);
      expect(result).toEqual([
        { path: "/api/v1/users", method: HttpMethod.GET },
        { path: "/api/v2/users", method: HttpMethod.GET },
      ]);
    });

    it("should preserve method from original RouteInfo", () => {
      const routeInfo: RouteInfo = { path: "/users", method: HttpMethod.PATCH };
      spyOn(mockRoutePathFactory, "create").mockReturnValue(["/api/users"]);

      const result = (mapper as any).getRouteInfoFromObject(routeInfo);
      expect(result[0].method).toBe(HttpMethod.PATCH);
    });

    it("should handle undefined versioning", () => {
      spyOn(mockHttpConfig, "getVersioning").mockReturnValue(undefined);
      const routeInfo: RouteInfo = { path: "/users", method: HttpMethod.DELETE };
      spyOn(mockRoutePathFactory, "create").mockReturnValue(["/api/users"]);

      (mapper as any).getRouteInfoFromObject(routeInfo);
      expect(mockRoutePathFactory.create).toHaveBeenCalledWith({
        methodPath: "/users",
        globalPrefix: "/api",
        versioningOptions: undefined,
        methodVersion: undefined,
      });
    });
  });

  describe("getRouteInfoFromController", () => {
    let mockDiscovery: ControllerDiscovery;
    let mockModuleRef: CoreModule;

    beforeEach(() => {
      mockDiscovery = {
        prefixes: ["/users"],
        version: undefined,
        versioningOptions: undefined,
      } as any;

      mockModuleRef = new CoreModule(TestModule, mockContainer);

      spyOn(Reflector.reflector, "get").mockReturnValue(mockDiscovery);
      spyOn(mockRouteFinder, "getControllerInfo").mockReturnValue({
        prefixes: ["/users"],
        host: "",
        version: undefined,
        versioningOptions: undefined,
      });
      spyOn(mockRouteFinder, "getControllerRoutes").mockReturnValue([
        {
          paths: ["/list"],
          targetCallback: () => {},
          methodName: "x",
          requestMethod: HttpMethod.GET,
          version: undefined,
        },
      ]);
      spyOn(mapper as any, "getHostModuleOfController").mockReturnValue(mockModuleRef);
      spyOn(mapper as any, "getModulePath").mockReturnValue("/module");
      spyOn(mockHttpConfig, "getGlobalPrefix").mockReturnValue("/api");
      spyOn(mockRoutePathFactory, "create").mockReturnValue(["/api/module/users/list"]);
    });

    it("should get discovery metadata from controller", () => {
      (mapper as any).getRouteInfoFromController(TestController);
      expect(Reflector.reflector.get).toHaveBeenCalledWith(Controller, TestController);
    });

    it("should get controller info using route finder", () => {
      (mapper as any).getRouteInfoFromController(TestController);
      expect(mockRouteFinder.getControllerInfo).toHaveBeenCalledWith(mockDiscovery, mockHttpConfig);
    });

    it("should get controller routes", () => {
      (mapper as any).getRouteInfoFromController(TestController);
      expect(mockRouteFinder.getControllerRoutes).toHaveBeenCalledWith(
        expect.any(Object),
        TestController.prototype
      );
    });

    it("should get host module and module path", () => {
      const getHostModuleSpy = spyOn(mapper as any, "getHostModuleOfController");
      const getModulePathSpy = spyOn(mapper as any, "getModulePath");
      
      (mapper as any).getRouteInfoFromController(TestController);
      
      expect(getHostModuleSpy).toHaveBeenCalledWith(TestController);
      expect(getModulePathSpy).toHaveBeenCalledWith(TestModule);
    });

    it("should create route path metadata and generate paths", () => {
      const result = (mapper as any).getRouteInfoFromController(TestController);
      
      expect(mockRoutePathFactory.create).toHaveBeenCalledWith(
        {
          modulePath: "/module",
          globalPrefix: "/api",
          methodPath: "/list",
          controllerPath: "/users",
          methodVersion: undefined,
          controllerVersion: undefined,
          versioningOptions: undefined,
        },
        HttpMethod.GET
      );
      
      expect(result).toEqual([{ path: "/api/module/users/list", method: HttpMethod.GET }]);
    });

    it("should handle multiple controller prefixes", () => {
      spyOn(mockRouteFinder, "getControllerInfo").mockReturnValue({
        prefixes: ["/users", "/people"],
        host: undefined,
        version: undefined,
        versioningOptions: undefined,
      });
      
      spyOn(mockRoutePathFactory, "create")
        .mockReturnValueOnce(["/api/module/users/list"])
        .mockReturnValueOnce(["/api/module/people/list"]);

      const result = (mapper as any).getRouteInfoFromController(TestController);
      
      expect(mockRoutePathFactory.create).toHaveBeenCalledTimes(2);
      expect(result).toEqual([
        { path: "/api/module/users/list", method: HttpMethod.GET },
        { path: "/api/module/people/list", method: HttpMethod.GET },
      ]);
    });

    it("should handle multiple routes per controller", () => {
      spyOn(mockRouteFinder, "getControllerRoutes").mockReturnValue([
        {
          paths: ["/list"],
          requestMethod: HttpMethod.GET,
          version: undefined,
          targetCallback: () => {},
          methodName: "list",
        },
        {
          paths: ["/create"],
          requestMethod: HttpMethod.POST,
          version: undefined,
          targetCallback: () => {},
          methodName: "create",
        },
      ]);
      
      spyOn(mockRoutePathFactory, "create")
        .mockReturnValueOnce(["/api/module/users/list"])
        .mockReturnValueOnce(["/api/module/users/create"]);

      const result = (mapper as any).getRouteInfoFromController(TestController);
      
      expect(result).toEqual([
        { path: "/api/module/users/list", method: HttpMethod.GET },
        { path: "/api/module/users/create", method: HttpMethod.POST },
      ]);
    });

    it("should handle multiple paths per route", () => {
      spyOn(mockRouteFinder, "getControllerRoutes").mockReturnValue([
        {
          paths: ["/", "/list"],
          targetCallback: () => {},
          methodName: "list",
          requestMethod: HttpMethod.GET,
          version: undefined,
        },
      ]);
      
      spyOn(mockRoutePathFactory, "create")
        .mockReturnValueOnce(["/api/module/users"])
        .mockReturnValueOnce(["/api/module/users/list"]);

      const result = (mapper as any).getRouteInfoFromController(TestController);
      
      expect(result).toEqual([
        { path: "/api/module/users", method: HttpMethod.GET },
        { path: "/api/module/users/list", method: HttpMethod.GET },
      ]);
    });

    it("should handle controller and method versions", () => {
      spyOn(mockRouteFinder, "getControllerInfo").mockReturnValue({
        prefixes: ["/users"],
        host: undefined,
        version: "1",
        versioningOptions: { type: HttpVersioningType.URI },
      });
      
      spyOn(mockRouteFinder, "getControllerRoutes").mockReturnValue([
        {
          paths: ["/list"],
          targetCallback: () => {},
          methodName: "list",
          requestMethod: HttpMethod.GET,
          version: "2",
        },
      ]);

      (mapper as any).getRouteInfoFromController(TestController);
      
      expect(mockRoutePathFactory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          controllerPath: "/users",
          globalPrefix: "/api",
          methodPath: "/list",
          modulePath: "/module",
          methodVersion: "2",
          controllerVersion: "1",
          versioningOptions: { type: HttpVersioningType.URI },
        }),
        HttpMethod.GET
      );
    });

    it("should handle undefined module reference", () => {
      spyOn(mapper as any, "getHostModuleOfController").mockReturnValue(undefined);
      spyOn(mapper as any, "getModulePath").mockReturnValue(undefined);

      (mapper as any).getRouteInfoFromController(TestController);
      
      expect(mockRoutePathFactory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          modulePath: undefined,
        }),
        HttpMethod.GET
      );
    });

    it("should handle route path factory returning multiple endpoints", () => {
      spyOn(mockRoutePathFactory, "create").mockReturnValue([
        "/api/v1/module/users/list",
        "/api/v2/module/users/list",
      ]);

      const result = (mapper as any).getRouteInfoFromController(TestController);
      
      expect(result).toEqual([
        { path: "/api/v1/module/users/list", method: HttpMethod.GET },
        { path: "/api/v2/module/users/list", method: HttpMethod.GET },
      ]);
    });

    it("should handle empty controller routes", () => {
      spyOn(mockRouteFinder, "getControllerRoutes").mockReturnValue([]);

      const result = (mapper as any).getRouteInfoFromController(TestController);
      
      expect(result).toEqual([]);
      expect(mockRoutePathFactory.create).not.toHaveBeenCalled();
    });
  });

  describe("getHostModuleOfController", () => {
    let mockModulesContainer: Map<string, CoreModule>;
    let mockModuleRefsSet: Set<CoreModule>;
    let module1: CoreModule;
    let module2: CoreModule;

    beforeEach(() => {
      mockModulesContainer = new Map();
      mockModuleRefsSet = new Set();
      
      module1 = new CoreModule(TestModule, mockContainer);
      module2 = new CoreModule(TestController, mockContainer);
      
      mockModulesContainer.set("module1", module1);
      mockModulesContainer.set("module2", module2);
      mockModuleRefsSet.add(module1);
      mockModuleRefsSet.add(module2);

      // @ts-expect-error Mismatch type
      spyOn(mockContainer, "getModules").mockReturnValue(mockModulesContainer);
      spyOn(targetModulesByContainer, "get").mockReturnValue(mockModuleRefsSet);
    });

    it("should return undefined for undefined metatype", () => {
      const result = (mapper as any).getHostModuleOfController(undefined);
      expect(result).toBeUndefined();
    });

    it("should return undefined when no modules container found", () => {
      spyOn(targetModulesByContainer, "get").mockReturnValue(undefined);
      const result = (mapper as any).getHostModuleOfController(TestController);
      expect(result).toBeUndefined();
    });

    it("should find module containing the controller", () => {
      const mockInjectables = new Map();
      mockInjectables.set(TestController, {});
      // @ts-expect-error Private fields
      spyOn(module1, "_injectables").mockReturnValue(mockInjectables);

      const result = (mapper as any).getHostModuleOfController(TestController);
      expect(result).toBe(module1);
    });

    it("should return undefined when controller not found in any module", () => {
      const mockInjectables1 = new Map();
      const mockInjectables2 = new Map();
      // @ts-expect-error Private fields
      spyOn(module1, "_injectables").mockReturnValue(mockInjectables1);
      // @ts-expect-error Private fields
      spyOn(module2, "_injectables").mockReturnValue(mockInjectables2);

      const result = (mapper as any).getHostModuleOfController(TestController);
      expect(result).toBeUndefined();
    });

    it("should filter modules by moduleRefsSet", () => {
      const module3 = new CoreModule(class OtherModule {}, mockContainer);
      mockModulesContainer.set("module3", module3);
      
      const mockInjectables = new Map();
      mockInjectables.set(TestController, {});
      // @ts-expect-error Private fields
      spyOn(module3, "_injectables").mockReturnValue(mockInjectables);

      const result = (mapper as any).getHostModuleOfController(TestController);
      expect(result).toBeUndefined();
    });

    it("should check injectables map correctly", () => {
      const mockInjectables = new Map();
      mockInjectables.set(TestController, {});
      // @ts-expect-error Private fields
      spyOn(module2, "_injectables").mockReturnValue(mockInjectables);
      
      const hasSpy = spyOn(mockInjectables, "has").mockReturnValue(true);

      const result = (mapper as any).getHostModuleOfController(TestController);
      expect(hasSpy).toHaveBeenCalledWith(TestController);
      expect(result).toBe(module2);
    });
  });

  describe("getModulePath", () => {
    beforeEach(() => {
      // @ts-expect-error Mismatch types
      spyOn(mockContainer, "getModules").mockReturnValue(new Map([["test", new CoreModule(TestModule, mockContainer)]]));
    });

    it("should return undefined for undefined metatype", () => {
      const result = (mapper as any).getModulePath(undefined);
      expect(result).toBeUndefined();
    });

    it("should get module path with application ID", () => {
      const mockModulesContainer = mockContainer.getModules();
      // @ts-expect-error Mismatch types
      spyOn(mockModulesContainer, "applicationId").mockReturnValue("test-app-id");
      spyOn(Reflect, "getMetadata")
        .mockReturnValueOnce("application-specific-path")
        .mockReturnValueOnce("default-path");

      const result = (mapper as any).getModulePath(TestModule);
      
      expect(Reflect.getMetadata).toHaveBeenCalledWith(
        MODULE_PATH + "test-app-id",
        TestModule
      );
      expect(result).toBe("application-specific-path");
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle malformed RouteInfo object", () => {
      const malformedRoute = { path: null, method: "INVALID" } as any;
      spyOn(mapper as any, "getRouteInfoFromObject").mockReturnValue([]);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = mapper.mapRouteToRouteInfo(malformedRoute);
      expect(result).toEqual([]);
    });

    it("should handle controller without metadata", () => {
      spyOn(Reflector.reflector, "get").mockReturnValue(undefined);
      spyOn(mockRouteFinder, "getControllerInfo").mockReturnValue({
        prefixes: [],
        host: undefined,
        version: undefined,
        versioningOptions: undefined,
      });
      spyOn(mockRouteFinder, "getControllerRoutes").mockReturnValue([]);

      const result = (mapper as any).getRouteInfoFromController(TestController);
      expect(result).toEqual([]);
    });

    it("should handle empty global prefix correctly", () => {
      spyOn(mockHttpConfig, "getGlobalPrefix").mockReturnValue("");
      spyOn(mockRoutePathFactory, "create").mockReturnValue(["/test"]);
      
      const result = (mapper as any).getRouteInfoFromPath("/test");
      expect(result[0].path).toBe("/test");
    });

    it("should handle route path factory errors gracefully", () => {
      spyOn(mockRoutePathFactory, "create").mockImplementation(() => {
        throw new Error("Path factory error");
      });

      expect(() => (mapper as any).getRouteInfoFromPath("/test")).toThrow("Path factory error");
    });

    it("should handle very long paths", () => {
      const longPath = "/very/long/path/that/goes/on/and/on/and/on/and/on/and/on".repeat(10);
      spyOn(mockRoutePathFactory, "create").mockReturnValue([longPath]);
      
      const result = (mapper as any).getRouteInfoFromPath(longPath);
      expect(result[0].path).toBe(longPath);
    });
  });

  describe("integration tests", () => {
    beforeEach(() => {
      mockHttpConfig = {
        getGlobalPrefix: () => "/api/v1",
        getVersioning: () => ({ type: "uri", prefix: "v" }),
        getGlobalPrefixOptions: () => ({ exclude: [] }),
      } as any;

      mapper = new MiddlewareRoutesMapper(mockContainer, mockHttpConfig);
    });

    it("should handle complex routing scenario with all input types", () => {
      const stringRoute = "/health";
      const objectRoute: RouteInfo = { path: "/users", method: HttpMethod.GET, version: "2" };
      
      spyOn(mapper as any, "getRouteInfoFromPath").mockReturnValue([{ path: "/api/v1/health", method: HttpMethod.ALL }]);
      spyOn(mapper as any, "getRouteInfoFromObject").mockReturnValue([{ path: "/api/v1/v2/users", method: HttpMethod.GET }]);
      spyOn(mapper as any, "getRouteInfoFromController").mockReturnValue([{ path: "/api/v1/auth/login", method: HttpMethod.POST }]);

      const stringResult = mapper.mapRouteToRouteInfo(stringRoute);
      const objectResult = mapper.mapRouteToRouteInfo(objectRoute);
      const controllerResult = mapper.mapRouteToRouteInfo(TestController);

      expect(stringResult).toEqual([{ path: "/api/v1/health", method: HttpMethod.ALL }]);
      expect(objectResult).toEqual([{ path: "/api/v1/v2/users", method: HttpMethod.GET }]);
      expect(controllerResult).toEqual([{ path: "/api/v1/auth/login", method: HttpMethod.POST }]);
    }); 1;
  });

  describe("performance considerations", () => {
    it("should handle large number of routes efficiently", () => {
      const manyRoutes = Array.from({ length: 1000 }, (_, i) => ({
        paths: [`/route${i}`],
        requestMethod: HttpMethod.GET,
        version: undefined,
      }));

      spyOn(Reflector.reflector, "get").mockReturnValue({ prefixes: ["/api"] } as any);
      spyOn(mockRouteFinder, "getControllerInfo").mockReturnValue({
        prefixes: ["/api"],
        host: undefined,
        version: undefined,
        versioningOptions: undefined,
      });
      // @ts-expect-error Mismatch types
      spyOn(mockRouteFinder, "getControllerRoutes").mockReturnValue(manyRoutes);
      spyOn(mapper as any, "getHostModuleOfController").mockReturnValue(undefined);
      spyOn(mapper as any, "getModulePath").mockReturnValue(undefined);
      spyOn(mockRoutePathFactory, "create").mockImplementation(
        (metadata) => [`/processed${metadata.methodPath}`]
      );

      const startTime = Date.now();
      const result = (mapper as any).getRouteInfoFromController(TestController);
      const endTime = Date.now();

      expect(result).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});