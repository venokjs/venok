/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unused-vars */
import type { InstanceWrapper, Type, VenokContainer, VenokParamsFactoryInterface } from "@venok/core";

import type { VersioningOptions, VersionValue } from "~/interfaces/index.js";

import { Inject, Logger, MetadataScanner, MODULE_PATH, Reflector } from "@venok/core";
import { DiscoveryService, ExplorerService } from "@venok/integration";
import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { pathToRegexp } from "path-to-regexp";

import { VERSION_NEUTRAL } from "~/interfaces/index.js";
import { HttpExplorerService } from "~/http/explorer.js";
import { HttpConfig } from "~/http/config.js";
import { RoutePathFactory } from "~/router/path-factory.js";
import { RouteFinder } from "~/router/finder.js";
import { HttpExceptionFiltersContext } from "~/filters/context.js";
import { HttpContextCreator } from "~/http/context.js";
import { HttpVersioningType } from "~/enums/version-type.enum.js";
import { ControllerDiscovery, RouteDiscovery } from "~/helpers/discovery.helper.js";
import { HttpMethod } from "~/enums/method.enum.js";
import { CONTROLLER_MAPPING_MESSAGE, ROUTE_MAPPED_MESSAGE, VERSIONED_CONTROLLER_MAPPING_MESSAGE, VERSIONED_ROUTE_MAPPED_MESSAGE } from "~/helpers/messages.helper.js";

// Mock classes for testing
class MockHttpAdapter {
  getParamsFactory = mock(() => mockParamsFactory);
}

const mockParamsFactory: VenokParamsFactoryInterface = {
  exchangeKeyForValue: mock((key: any, data: any, { metatype }: any) => "mock-param"),
};

class TestController {
  testMethod() {
    return "test-result";
  }
  
  anotherMethod() {
    return "another-result";
  }
}

class VersionedController {
  versionedMethod() {
    return "versioned-result";
  }
}

class HostedController {
  hostedMethod() {
    return "hosted-result";
  }
}

describe("HttpExplorerService", () => {
  let explorerService: HttpExplorerService;
  let httpConfig: HttpConfig;
  let container: VenokContainer;
  let discoveryService: DiscoveryService;
  let metadataScanner: MetadataScanner;
  let routeFinder: RouteFinder;
  let pathFactory: RoutePathFactory;
  let mockAdapter: MockHttpAdapter;
  let loggerLogSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    // Setup mocks
    mockAdapter = new MockHttpAdapter();
    container = {
      getModules: mock(() => ({
        applicationId: "test-app-id",
        values: () => [],
      })),
      getModuleByKey: mock(() => ({})),
      getContextId: mock(() => "test-context-id"),
    } as any;

    discoveryService = {
      getProviders: mock(() => []),
    } as any;

    metadataScanner = new MetadataScanner();

    // Setup HTTP config
    httpConfig = new HttpConfig({
      port: 3000,
      hostname: "localhost",
      listenCallback: mock(() => Promise.resolve()),
      callback: mock(() => {}),
      adapter: mockAdapter as any,
    });

    // Setup explorer service
    explorerService = new HttpExplorerService(
      container,
      discoveryService,
      metadataScanner
    );

    // Inject dependencies
    (explorerService as any).httpConfig = httpConfig;

    // Setup spies
    loggerLogSpy = spyOn(Logger.prototype, "log").mockImplementation(() => {});
    spyOn(Reflector.prototype, "get").mockImplementation(() => undefined);

    // Initialize the service
    explorerService.onModuleInit();

    routeFinder = (explorerService as any).routeFinder;
    pathFactory = (explorerService as any).pathFactory;
  });

  afterEach(() => {
    loggerLogSpy.mockRestore();
  });

  describe("constructor", () => {
    it("should create instance with required dependencies", () => {
      expect(explorerService).toBeDefined();
      expect(explorerService).toBeInstanceOf(ExplorerService);
      expect((explorerService as any).httpConfig).toBe(httpConfig);
      expect((explorerService as any).routeFinder).toBeInstanceOf(RouteFinder);
      expect((explorerService as any).logger).toBeInstanceOf(Logger);
    });

    it("should initialize route finder with metadata scanner", () => {
      expect(routeFinder).toBeDefined();
      expect((routeFinder as any).metadataScanner).toBeInstanceOf(MetadataScanner);
    });

    it("should set up logger with timestamp enabled", () => {
      const loggerOptions = (explorerService as any).logger.options;
      expect(loggerOptions.timestamp).toBe(true);
    });
  });

  describe("onModuleInit", () => {
    it("should initialize path factory with http config", () => {
      explorerService.onModuleInit();
      
      expect((explorerService as any).pathFactory).toBeInstanceOf(RoutePathFactory);
      expect((explorerService as any).pathFactory).toBeDefined();
    });

    it("should set params factory from adapter", () => {
      explorerService.onModuleInit();
      
      expect((explorerService as any).paramsFactory).toBe(mockParamsFactory);
      expect(mockAdapter.getParamsFactory).toHaveBeenCalled();
    });

    it("should be called manually and work correctly", () => {
      const newService = new HttpExplorerService(container, discoveryService, metadataScanner);
      (newService as any).httpConfig = httpConfig;
      
      expect(() => {
        newService.onModuleInit();
      }).not.toThrow();
      
      expect((newService as any).pathFactory).toBeInstanceOf(RoutePathFactory);
      expect((newService as any).paramsFactory).toBe(mockParamsFactory);
    });
  });

  describe("getSettings", () => {
    it("should return correct explorer settings", () => {
      const settings = (explorerService as any).getSettings();
      
      expect(settings).toEqual({
        contextType: "http",
        isRequestScopeSupported: true,
        exceptionsFilterClass: HttpExceptionFiltersContext,
        contextCreatorClass: HttpContextCreator,
        options: { guards: true, interceptors: true, filters: false },
      });
    });

    it("should use correct context type", () => {
      const settings = (explorerService as any).getSettings();
      expect(settings.contextType).toBe("http");
    });

    it("should support request scope", () => {
      const settings = (explorerService as any).getSettings();
      expect(settings.isRequestScopeSupported).toBe(true);
    });

    it("should configure options correctly", () => {
      const settings = (explorerService as any).getSettings();
      expect(settings.options.guards).toBe(true);
      expect(settings.options.interceptors).toBe(true);
      expect(settings.options.filters).toBe(false);
    });
  });

  describe("filterProperties", () => {
    let testWrapper: InstanceWrapper;
    let controllerDiscovery: ControllerDiscovery;

    beforeEach(() => {
      testWrapper = {
        instance: new TestController(),
        metatype: TestController,
        name: "TestController",
      } as any;

      controllerDiscovery = new ControllerDiscovery({} as any);

      // Mock the get method to return controller discovery
      spyOn(explorerService as any, "get").mockImplementation((metadataKey: any, metatype: typeof TestController) => {
        if (metatype === TestController) return controllerDiscovery;
        return undefined;
      });

      // Mock route finder methods
      spyOn(routeFinder, "getControllerInfo").mockReturnValue({
        prefixes: ["/test"],
        version: undefined,
        versioningOptions: undefined,
        host: undefined,
      });

      spyOn(routeFinder, "getControllerRoutes").mockReturnValue([
        {
          methodName: "testMethod",
          paths: ["/method"],
          requestMethod: HttpMethod.GET,
          version: undefined,
          targetCallback: TestController.prototype.testMethod,
        },
      ]);

      // Mock create callback
      spyOn(explorerService as any, "createCallback").mockReturnValue(mock(() => {}));

      // Mock path factory
      spyOn(pathFactory, "create").mockReturnValue(["/api/test/method"]);
      spyOn(pathFactory, "getVersion").mockReturnValue(undefined);
    });

    it("should return undefined when wrapper has no metatype", () => {
      const wrapperWithoutMetatype = { instance: new TestController() } as InstanceWrapper;
      
      const result = (explorerService as any).filterProperties(wrapperWithoutMetatype, "test-key");
      
      expect(result).toBeUndefined();
    });

    it("should return undefined when no controller discovery found", () => {
      spyOn(explorerService as any, "get").mockReturnValue(undefined);
      
      const result = (explorerService as any).filterProperties(testWrapper, "test-key");
      
      expect(result).toBeUndefined();
    });

    it("should process controller with routes successfully", () => {
      const result = (explorerService as any).filterProperties(testWrapper, "test-key");
      
      expect(result).toBe(controllerDiscovery);
      expect(routeFinder.getControllerInfo).toHaveBeenCalledWith(controllerDiscovery, httpConfig);
      expect(routeFinder.getControllerRoutes).toHaveBeenCalledWith(testWrapper.instance);
    });

    it("should handle controller with multiple routes", () => {
      spyOn(routeFinder, "getControllerRoutes").mockReturnValue([
        {
          methodName: "testMethod",
          paths: ["/method1"],
          requestMethod: HttpMethod.GET,
          version: undefined,
          targetCallback: TestController.prototype.testMethod,
        },
        {
          methodName: "anotherMethod",
          paths: ["/method2"],
          requestMethod: HttpMethod.POST,
          version: undefined,
          targetCallback: TestController.prototype.anotherMethod,
        },
      ]);

      const result = (explorerService as any).filterProperties(testWrapper, "test-key");
      
      expect(result).toBe(controllerDiscovery);
      expect(routeFinder.getControllerRoutes).toHaveBeenCalledWith(testWrapper.instance);
    });

    it("should handle controller with versioning", () => {
      const versioningOptions: VersioningOptions = {
        type: HttpVersioningType.HEADER,
        header: "X-API-Version",
        defaultVersion: "1.0",
      };

      spyOn(routeFinder, "getControllerInfo").mockReturnValue({
        prefixes: ["/test"],
        version: "1.0",
        versioningOptions,
        host: undefined,
      });

      spyOn(routeFinder, "getControllerRoutes").mockReturnValue([
        {
          methodName: "testMethod",
          paths: ["/method"],
          requestMethod: HttpMethod.GET,
          version: "1.0",
          targetCallback: TestController.prototype.testMethod,
        },
      ]);

      const result = (explorerService as any).filterProperties(testWrapper, "test-key");
      
      expect(result).toBe(controllerDiscovery);
    });

    it("should handle controller with URI versioning", () => {
      const versioningOptions: VersioningOptions = {
        type: HttpVersioningType.URI,
        prefix: "v",
        defaultVersion: "1",
      };

      spyOn(routeFinder, "getControllerInfo").mockReturnValue({
        prefixes: ["/test"],
        version: "1",
        versioningOptions,
        host: undefined,
      });

      const result = (explorerService as any).filterProperties(testWrapper, "test-key");
      
      expect(result).toBe(controllerDiscovery);
    });

    it("should handle controller with host metadata", () => {
      spyOn(routeFinder, "getControllerInfo").mockReturnValue({
        prefixes: ["/test"],
        version: undefined,
        versioningOptions: undefined,
        host: "api.example.com",
      });

      const result = (explorerService as any).filterProperties(testWrapper, "test-key");
      
      expect(result).toBe(controllerDiscovery);
    });

    it("should handle controller with multiple hosts", () => {
      spyOn(routeFinder, "getControllerInfo").mockReturnValue({
        prefixes: ["/test"],
        version: undefined,
        versioningOptions: undefined,
        host: ["api1.example.com", "api2.example.com"],
      });

      const result = (explorerService as any).filterProperties(testWrapper, "test-key");
      
      expect(result).toBe(controllerDiscovery);
    });

    it("should handle controller with regex host", () => {
      spyOn(routeFinder, "getControllerInfo").mockReturnValue({
        prefixes: ["/test"],
        version: undefined,
        versioningOptions: undefined,
        host: /^api\d+\.example\.com$/,
      });

      const result = (explorerService as any).filterProperties(testWrapper, "test-key");
      
      expect(result).toBe(controllerDiscovery);
    });

    it("should create RouteDiscovery instances for each route", () => {
      spyOn(routeFinder, "getControllerRoutes").mockReturnValue([
        {
          methodName: "testMethod",
          paths: ["/method1", "/method2"],
          requestMethod: HttpMethod.GET,
          version: undefined,
          targetCallback: TestController.prototype.testMethod,
        },
      ]);

      const pushItemSpy = spyOn(controllerDiscovery, "pushItem");
      
      (explorerService as any).filterProperties(testWrapper, "test-key");
      
      expect(pushItemSpy).toHaveBeenCalledTimes(2); // Two paths = two route discoveries
      expect(pushItemSpy).toHaveBeenCalledWith(expect.any(RouteDiscovery));
    });

    it("should set discovery on controller and route objects", () => {
      const setDiscoverySpy = spyOn(controllerDiscovery, "setDiscovery");
      
      (explorerService as any).filterProperties(testWrapper, "test-key");
      
      expect(setDiscoverySpy).toHaveBeenCalledWith({
        class: testWrapper.instance.constructor,
      });
    });
  });

  describe("getModulePathMetadata", () => {
    it("should return module path metadata when available", () => {
      const testMetatype = class TestModule {};
      const expectedPath = "/modules/test";
      
      spyOn(Reflect, "getMetadata").mockImplementation((key, target) => {
        if (key === MODULE_PATH + "test-app-id" && target === testMetatype) {
          return expectedPath;
        }
        return undefined;
      });

      const result = (explorerService as any).getModulePathMetadata(testMetatype);
      
      expect(result).toBe(expectedPath);
    });

    it("should fallback to basic MODULE_PATH when app-specific not found", () => {
      const testMetatype = class TestModule {};
      const expectedPath = "/modules/fallback";
      
      spyOn(Reflect, "getMetadata").mockImplementation((key, target) => {
        if (key === MODULE_PATH + "test-app-id") {
          return undefined;
        }
        if (key === MODULE_PATH && target === testMetatype) {
          return expectedPath;
        }
        return undefined;
      });

      const result = (explorerService as any).getModulePathMetadata(testMetatype);
      
      expect(result).toBe(expectedPath);
    });

    it("should return undefined when no metadata found", () => {
      const testMetatype = class TestModule {};
      
      spyOn(Reflect, "getMetadata").mockReturnValue(undefined);

      const result = (explorerService as any).getModulePathMetadata(testMetatype);
      
      expect(result).toBeUndefined();
    });
  });

  describe("logController", () => {
    beforeEach(() => {
      spyOn(pathFactory, "create").mockReturnValue(["/api/v1/test"]);
    });

    it("should log controller mapping without version", () => {
      (explorerService as any).logController("/test", undefined, "TestController", "/api", undefined);
      
      expect(pathFactory.create).toHaveBeenCalledWith({
        controllerPath: "/test",
        globalPrefix: "/api",
        modulePath: undefined,
      });
      
      expect(loggerLogSpy).toHaveBeenCalledWith(
        CONTROLLER_MAPPING_MESSAGE("TestController", "/api/v1/test")
      );
    });

    it("should log versioned controller mapping", () => {
      (explorerService as any).logController("/test", "2.0", "TestController", "/api", "/modules/test");
      
      expect(loggerLogSpy).toHaveBeenCalledWith(
        VERSIONED_CONTROLLER_MAPPING_MESSAGE("TestController", "/api/v1/test", "2.0")
      );
    });

    it("should handle multiple controller paths", () => {
      spyOn(pathFactory, "create").mockReturnValue(["/api/v1/test", "/api/v2/test"]);
      
      (explorerService as any).logController("/test", "1.0", "TestController", "/api", undefined);
      
      expect(loggerLogSpy).toHaveBeenCalledTimes(2);
      expect(loggerLogSpy).toHaveBeenNthCalledWith(1,
        VERSIONED_CONTROLLER_MAPPING_MESSAGE("TestController", "/api/v1/test", "1.0")
      );
      expect(loggerLogSpy).toHaveBeenNthCalledWith(2,
        VERSIONED_CONTROLLER_MAPPING_MESSAGE("TestController", "/api/v2/test", "1.0")
      );
    });

    it("should handle array versions", () => {
      const versions = ["1.0", "2.0"];
      (explorerService as any).logController("/test", versions, "TestController", "/api", undefined);
      
      expect(loggerLogSpy).toHaveBeenCalledWith(
        VERSIONED_CONTROLLER_MAPPING_MESSAGE("TestController", "/api/v1/test", versions)
      );
    });
  });

  describe("logRoute", () => {
    let routeMetadata: any;

    beforeEach(() => {
      routeMetadata = {
        modulePath: "/modules/test",
        globalPrefix: "/api",
        methodPath: "/method",
        controllerPath: "/test",
        methodVersion: undefined,
        controllerVersion: undefined,
        versioningOptions: undefined,
      };

      spyOn(pathFactory, "create").mockReturnValue(["/api/test/method"]);
      spyOn(pathFactory, "getVersion").mockReturnValue(undefined);
    });

    it("should log route mapping without version", () => {
      (explorerService as any).logRoute(routeMetadata, HttpMethod.GET, false);
      
      expect(pathFactory.create).toHaveBeenCalledWith(
        { ...routeMetadata, versioningOptions: undefined },
        HttpMethod.GET
      );
      
      expect(loggerLogSpy).toHaveBeenCalledWith(
        ROUTE_MAPPED_MESSAGE("/api/test/method", HttpMethod.GET)
      );
    });

    it("should log versioned route mapping", () => {
      spyOn(pathFactory, "getVersion").mockReturnValue("1.0");
      
      (explorerService as any).logRoute(routeMetadata, HttpMethod.POST, true);
      
      expect(loggerLogSpy).toHaveBeenCalledWith(
        VERSIONED_ROUTE_MAPPED_MESSAGE("/api/test/method", HttpMethod.POST, "1.0")
      );
    });

    it("should handle multiple route paths", () => {
      spyOn(pathFactory, "create").mockReturnValue(["/api/v1/test/method", "/api/v2/test/method"]);
      
      (explorerService as any).logRoute(routeMetadata, HttpMethod.DELETE, false);
      
      expect(loggerLogSpy).toHaveBeenCalledTimes(2);
      expect(loggerLogSpy).toHaveBeenNthCalledWith(1,
        ROUTE_MAPPED_MESSAGE("/api/v1/test/method", HttpMethod.DELETE)
      );
      expect(loggerLogSpy).toHaveBeenNthCalledWith(2,
        ROUTE_MAPPED_MESSAGE("/api/v2/test/method", HttpMethod.DELETE)
      );
    });

    it("should handle VERSION_NEUTRAL version", () => {
      spyOn(pathFactory, "getVersion").mockReturnValue(VERSION_NEUTRAL);
      
      (explorerService as any).logRoute(routeMetadata, HttpMethod.PATCH, true);
      
      expect(loggerLogSpy).toHaveBeenCalledWith(
        VERSIONED_ROUTE_MAPPED_MESSAGE("/api/test/method", HttpMethod.PATCH, VERSION_NEUTRAL)
      );
    });

    it("should handle array versions", () => {
      const versions = ["1.0", "2.0"];
      spyOn(pathFactory, "getVersion").mockReturnValue(versions);
      
      (explorerService as any).logRoute(routeMetadata, HttpMethod.HEAD, true);
      
      expect(loggerLogSpy).toHaveBeenCalledWith(
        VERSIONED_ROUTE_MAPPED_MESSAGE("/api/test/method", HttpMethod.HEAD, versions)
      );
    });
  });

  describe("Integration Tests", () => {
    it("should handle complete controller processing workflow", () => {
      const testWrapper: InstanceWrapper = {
        instance: new TestController(),
        metatype: TestController,
        name: "TestController",
      } as any;

      const controllerDiscovery = new ControllerDiscovery({} as any);

      // Setup complete mocks
      spyOn(explorerService as any, "get").mockReturnValue(controllerDiscovery);
      spyOn(routeFinder, "getControllerInfo").mockReturnValue({
        prefixes: ["/api/test"],
        version: "1.0",
        versioningOptions: {
          type: HttpVersioningType.HEADER,
          header: "X-Version",
          defaultVersion: "1.0",
        },
        host: "api.example.com",
      });
      spyOn(routeFinder, "getControllerRoutes").mockReturnValue([
        {
          methodName: "testMethod",
          paths: ["/get", "/find"],
          requestMethod: HttpMethod.GET,
          version: "1.0",
          targetCallback: TestController.prototype.testMethod,
        },
        {
          methodName: "anotherMethod",
          paths: ["/post"],
          requestMethod: HttpMethod.POST,
          version: undefined,
          targetCallback: TestController.prototype.anotherMethod,
        },
      ]);
      spyOn(explorerService as any, "createCallback").mockReturnValue(mock(() => {}));
      spyOn(pathFactory, "create").mockReturnValue(["/api/v1/test"]);
      spyOn(pathFactory, "getVersion").mockReturnValue("1.0");

      const result = (explorerService as any).filterProperties(testWrapper, "test-key");

      expect(result).toBe(controllerDiscovery);
      expect(loggerLogSpy).toHaveBeenCalled(); // Controller and route logging
    });

    it("should handle empty controller discovery gracefully", () => {
      const testWrapper: InstanceWrapper = {
        instance: {},
        metatype: class EmptyController {},
        name: "EmptyController",
      } as any;

      spyOn(explorerService as any, "get").mockReturnValue(undefined);

      const result = (explorerService as any).filterProperties(testWrapper, "test-key");

      expect(result).toBeUndefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle missing HTTP config gracefully", () => {
      const serviceWithoutConfig = new HttpExplorerService(container, discoveryService, metadataScanner);
      
      expect(() => {
        serviceWithoutConfig.onModuleInit();
      }).toThrow();
    });

    it("should handle route finder errors gracefully", () => {
      const testWrapper: InstanceWrapper = {
        instance: new TestController(),
        metatype: TestController,
        name: "TestController",
      } as any;

      const controllerDiscovery = new ControllerDiscovery({} as any);
      spyOn(explorerService as any, "get").mockReturnValue(controllerDiscovery);
      spyOn(routeFinder, "getControllerInfo").mockImplementation(() => {
        throw new Error("Route finder error");
      });

      expect(() => {
        (explorerService as any).filterProperties(testWrapper, "test-key");
      }).toThrow("Route finder error");
    });

    it("should handle invalid host patterns gracefully", () => {
      const testWrapper: InstanceWrapper = {
        instance: new TestController(),
        metatype: TestController,
        name: "TestController",
      } as any;

      const controllerDiscovery = new ControllerDiscovery({} as any);
      spyOn(explorerService as any, "get").mockReturnValue(controllerDiscovery);
      spyOn(routeFinder, "getControllerInfo").mockReturnValue({
        prefixes: ["/test"],
        version: undefined,
        versioningOptions: undefined,
        host: "api.example.com", // Valid host that should work
      });
      spyOn(routeFinder, "getControllerRoutes").mockReturnValue([
        {
          methodName: "testMethod",
          paths: ["/method"],
          requestMethod: HttpMethod.GET,
          version: undefined,
          targetCallback: TestController.prototype.testMethod,
        },
      ]);
      spyOn(explorerService as any, "createCallback").mockReturnValue(mock(() => {}));
      spyOn(pathFactory, "create").mockReturnValue(["/test/method"]);

      // Should process without throwing
      const result = (explorerService as any).filterProperties(testWrapper, "test-key");
      expect(result).toBe(controllerDiscovery);
    });
  });

  describe("Edge Cases", () => {
    it("should handle controller with no routes", () => {
      const testWrapper: InstanceWrapper = {
        instance: new TestController(),
        metatype: TestController,
        name: "TestController",
      } as any;

      const controllerDiscovery = new ControllerDiscovery({} as any);
      spyOn(explorerService as any, "get").mockReturnValue(controllerDiscovery);
      spyOn(routeFinder, "getControllerInfo").mockReturnValue({
        prefixes: ["/test"],
        version: undefined,
        versioningOptions: undefined,
        host: undefined,
      });
      spyOn(routeFinder, "getControllerRoutes").mockReturnValue([]);

      const result = (explorerService as any).filterProperties(testWrapper, "test-key");

      expect(result).toBe(controllerDiscovery);
    });

    it("should handle route with empty paths array", () => {
      const testWrapper: InstanceWrapper = {
        instance: new TestController(),
        metatype: TestController,
        name: "TestController",
      } as any;

      const controllerDiscovery = new ControllerDiscovery({} as any);
      spyOn(explorerService as any, "get").mockReturnValue(controllerDiscovery);
      spyOn(routeFinder, "getControllerInfo").mockReturnValue({
        prefixes: ["/test"],
        version: undefined,
        versioningOptions: undefined,
        host: undefined,
      });
      spyOn(routeFinder, "getControllerRoutes").mockReturnValue([
        {
          methodName: "testMethod",
          paths: [], // Empty paths
          requestMethod: HttpMethod.GET,
          version: undefined,
          targetCallback: TestController.prototype.testMethod,
        },
      ]);
      spyOn(explorerService as any, "createCallback").mockReturnValue(mock(() => {}));

      const result = (explorerService as any).filterProperties(testWrapper, "test-key");

      expect(result).toBe(controllerDiscovery);
    });

    it("should handle undefined controller instance", () => {
      const testWrapper: InstanceWrapper = {
        instance: undefined,
        metatype: TestController,
        name: "TestController",
      } as any;

      const result = (explorerService as any).filterProperties(testWrapper, "test-key");

      expect(result).toBeUndefined();
    });

    it("should handle null params factory", () => {
      spyOn(mockAdapter, "getParamsFactory").mockReturnValue(null as any);
      
      explorerService.onModuleInit();
      
      expect((explorerService as any).paramsFactory).toBeNull();
    });

    it("should handle mixed host types (string and regex)", () => {
      const testWrapper: InstanceWrapper = {
        instance: new TestController(),
        metatype: TestController,
        name: "TestController",
      } as any;

      const controllerDiscovery = new ControllerDiscovery({} as any);
      spyOn(explorerService as any, "get").mockReturnValue(controllerDiscovery);
      spyOn(routeFinder, "getControllerInfo").mockReturnValue({
        prefixes: ["/test"],
        version: undefined,
        versioningOptions: undefined,
        host: ["api.example.com", /^test\.example\.com$/],
      });
      spyOn(routeFinder, "getControllerRoutes").mockReturnValue([
        {
          methodName: "testMethod",
          paths: ["/method"],
          requestMethod: HttpMethod.GET,
          version: undefined,
          targetCallback: TestController.prototype.testMethod,
        },
      ]);
      spyOn(explorerService as any, "createCallback").mockReturnValue(mock(() => {}));
      spyOn(pathFactory, "create").mockReturnValue(["/test/method"]);

      const result = (explorerService as any).filterProperties(testWrapper, "test-key");

      expect(result).toBe(controllerDiscovery);
    });
  });
});