import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { MetadataScanner } from "@venok/core";

import { RouteFinder } from "~/router/finder.js";
import { ControllerDiscovery } from "~/helpers/discovery.helper.js";
import { HttpConfig } from "~/http/config.js";
import { HttpMethod } from "~/enums/method.enum.js";
import { METHOD_METADATA, PATH_METADATA, VERSION_METADATA } from "~/constants.js";
import { VERSION_NEUTRAL } from "~/interfaces/router/version.interface.js";

describe("RouteFinder", () => {
  let routeFinder: RouteFinder;
  let metadataScanner: MetadataScanner;
  let mockControllerDiscovery: ControllerDiscovery;
  let mockHttpConfig: HttpConfig;

  beforeEach(() => {
    metadataScanner = new MetadataScanner();
    routeFinder = new RouteFinder(metadataScanner);

    // Create mock instances
    mockControllerDiscovery = {
      getVersion: mock(() => undefined),
      getHost: mock(() => undefined),
      getPrefixes: mock(() => undefined),
    } as unknown as ControllerDiscovery;

    mockHttpConfig = {
      getVersioning: mock(() => undefined),
    } as unknown as HttpConfig;
  });

  afterEach(() => {
    // Ensure all mocks are restored after each test
    if ((Reflect.getMetadata as any).mockRestore) {
      (Reflect.getMetadata as any).mockRestore();
    }
  });

  describe("getControllerInfo", () => {
    it("should return controller info with version from discovery", () => {
      mockControllerDiscovery.getVersion = mock(() => "1.0");
      mockControllerDiscovery.getHost = mock(() => "localhost");
      mockControllerDiscovery.getPrefixes = mock(() => ["api", "v1"]);
      // @ts-expect-error Mismatch types
      mockHttpConfig.getVersioning = mock(() => ({ defaultVersion: "2.0" }));

      const result = routeFinder.getControllerInfo(mockControllerDiscovery, mockHttpConfig);

      expect(result.version).toBe("1.0");
      expect(result.host).toBe("localhost");
      expect(result.prefixes).toEqual(["/api", "/v1"]);
      // @ts-expect-error Mismatch types
      expect(result.versioningOptions).toEqual({ defaultVersion: "2.0" });
    });

    it("should fallback to default version from httpConfig when discovery has no version", () => {
      mockControllerDiscovery.getVersion = mock(() => undefined);
      // @ts-expect-error Mismatch types
      mockHttpConfig.getVersioning = mock(() => ({ defaultVersion: "default" }));

      const result = routeFinder.getControllerInfo(mockControllerDiscovery, mockHttpConfig);

      expect(result.version).toBe("default");
    });

    it("should handle undefined versioning options", () => {
      mockControllerDiscovery.getVersion = mock(() => undefined);
      mockHttpConfig.getVersioning = mock(() => undefined);

      const result = routeFinder.getControllerInfo(mockControllerDiscovery, mockHttpConfig);

      expect(result.version).toBeUndefined();
      expect(result.versioningOptions).toBeUndefined();
    });

    it("should handle RegExp host", () => {
      const hostRegex = /localhost/;
      mockControllerDiscovery.getHost = mock(() => hostRegex);

      const result = routeFinder.getControllerInfo(mockControllerDiscovery, mockHttpConfig);

      expect(result.host).toBe(hostRegex);
    });

    it("should handle array of hosts", () => {
      const hosts = ["localhost", "127.0.0.1", /test\.com/];
      mockControllerDiscovery.getHost = mock(() => hosts);

      const result = routeFinder.getControllerInfo(mockControllerDiscovery, mockHttpConfig);

      expect(result.host).toBe(hosts);
    });

    it("should handle VERSION_NEUTRAL", () => {
      // @ts-expect-error Mismatch types
      mockControllerDiscovery.getVersion = mock(() => VERSION_NEUTRAL);

      const result = routeFinder.getControllerInfo(mockControllerDiscovery, mockHttpConfig);

      expect(result.version).toBe(VERSION_NEUTRAL);
    });

    it("should handle array version", () => {
      const version = ["1.0", "2.0", VERSION_NEUTRAL];
      // @ts-expect-error Mismatch types
      mockControllerDiscovery.getVersion = mock(() => version);

      const result = routeFinder.getControllerInfo(mockControllerDiscovery, mockHttpConfig);

      // @ts-expect-error Mismatch types
      expect(result.version).toBe(version);
    });
  });

  describe("extractControllerPrefixes", () => {
    it("should return empty array for undefined prefixes", () => {
      const result = (routeFinder as any).extractControllerPrefixes(undefined);
      expect(result).toEqual([]);
    });

    it("should handle single string prefix", () => {
      const result = (routeFinder as any).extractControllerPrefixes("api");
      expect(result).toEqual(["/api"]);
    });

    it("should handle array of prefixes", () => {
      const result = (routeFinder as any).extractControllerPrefixes(["api", "v1", "users"]);
      expect(result).toEqual(["/api", "/v1", "/users"]);
    });

    it("should add leading slash to prefixes that don't have it", () => {
      const result = (routeFinder as any).extractControllerPrefixes(["api", "/v1", "users"]);
      expect(result).toEqual(["/api", "/v1", "/users"]);
    });

    it("should handle empty string prefix", () => {
      const result = (routeFinder as any).extractControllerPrefixes("");
      expect(result).toEqual([""]);
    });

    it("should handle empty array", () => {
      const result = (routeFinder as any).extractControllerPrefixes([]);
      expect(result).toEqual([]);
    });

    it("should preserve prefixes that already have leading slash", () => {
      const result = (routeFinder as any).extractControllerPrefixes(["/api", "/v1"]);
      expect(result).toEqual(["/api", "/v1"]);
    });
  });

  describe("getControllerRoutes", () => {
    it("should return routes from controller instance", () => {
      class TestController {
        testMethod() {
          return "test";
        }
        anotherMethod() {
          return "another";
        }
      }

      const instance = new TestController();
      const testPrototype = TestController.prototype;

      // Mock metadata for testMethod
      spyOn(Reflect, "getMetadata").mockImplementation((key, target) => {
        if (key === PATH_METADATA && target === testPrototype.testMethod) {
          return "/test";
        }
        if (key === METHOD_METADATA && target === testPrototype.testMethod) {
          return HttpMethod.GET;
        }
        if (key === PATH_METADATA && target === testPrototype.anotherMethod) {
          return "/another";
        }
        if (key === METHOD_METADATA && target === testPrototype.anotherMethod) {
          return HttpMethod.POST;
        }
        return undefined;
      });

      const result = routeFinder.getControllerRoutes(instance);

      expect(result).toHaveLength(2);
      
      const testRoute = result.find(r => r.methodName === "testMethod");
      expect(testRoute).toBeDefined();
      expect(testRoute!.paths).toEqual(["/test"]);
      expect(testRoute!.requestMethod).toBe(HttpMethod.GET);
      expect(testRoute!.targetCallback).toBe(instance.testMethod);

      const anotherRoute = result.find(r => r.methodName === "anotherMethod");
      expect(anotherRoute).toBeDefined();
      expect(anotherRoute!.paths).toEqual(["/another"]);
      expect(anotherRoute!.requestMethod).toBe(HttpMethod.POST);
      expect(anotherRoute!.targetCallback).toBe(instance.anotherMethod);

      (Reflect.getMetadata as any).mockRestore();
    });

    it("should use provided prototype instead of instance prototype", () => {
      class TestController {
        testMethod() {
          return "test";
        }
      }

      class CustomPrototype {
        testMethod() {
          return "custom";
        }
      }

      const instance = new TestController();
      const customPrototype = CustomPrototype.prototype;

      const scannerSpy = spyOn(metadataScanner, "getAllMethodNames").mockReturnValue(["testMethod"]);

      spyOn(Reflect, "getMetadata").mockImplementation((key, target) => {
        if (key === PATH_METADATA && target === customPrototype.testMethod) {
          return "/custom";
        }
        if (key === METHOD_METADATA && target === customPrototype.testMethod) {
          return HttpMethod.GET;
        }
        return undefined;
      });

      const result = routeFinder.getControllerRoutes(instance, customPrototype);

      expect(scannerSpy).toHaveBeenCalledWith(customPrototype);
      expect(result).toHaveLength(1);
      expect(result[0].paths).toEqual(["/custom"]);

      scannerSpy.mockRestore();
      (Reflect.getMetadata as any).mockRestore();
    });

    it("should skip methods without PATH_METADATA", () => {
      class TestController {
        withPath() {
          return "with";
        }
        withoutPath() {
          return "without";
        }
      }

      const instance = new TestController();

      spyOn(Reflect, "getMetadata").mockImplementation((key, target) => {
        if (key === PATH_METADATA && target === TestController.prototype.withPath) {
          return "/with-path";
        }
        if (key === METHOD_METADATA && target === TestController.prototype.withPath) {
          return HttpMethod.GET;
        }
        // withoutPath has no PATH_METADATA
        return undefined;
      });

      const result = routeFinder.getControllerRoutes(instance);

      expect(result).toHaveLength(1);
      expect(result[0].methodName).toBe("withPath");

      (Reflect.getMetadata as any).mockRestore();
    });

    it("should handle empty controller with no methods", () => {
      class EmptyController {}

      const instance = new EmptyController();
      const scannerSpy = spyOn(metadataScanner, "getAllMethodNames").mockReturnValue([]);

      const result = routeFinder.getControllerRoutes(instance);

      expect(result).toHaveLength(0);
      scannerSpy.mockRestore();
    });
  });

  describe("exploreMethod", () => {
    let testInstance: any;
    let testPrototype: any;

    beforeEach(() => {
      class TestController {
        testMethod() {
          return "test";
        }
      }
      testInstance = new TestController();
      testPrototype = TestController.prototype;
    });

    it("should return route definition for method with metadata", () => {
      spyOn(Reflect, "getMetadata").mockImplementation((key) => {
        if (key === PATH_METADATA) return "/test";
        if (key === METHOD_METADATA) return HttpMethod.GET;
        if (key === VERSION_METADATA) return "1.0";
        return undefined;
      });

      const result = (routeFinder as any).exploreMethod(testInstance, testPrototype, "testMethod");

      expect(result).toEqual({
        paths: ["/test"],
        requestMethod: HttpMethod.GET,
        targetCallback: testInstance.testMethod,
        methodName: "testMethod",
        version: "1.0",
      });

      (Reflect.getMetadata as any).mockRestore();
    });

    it("should return null for method without PATH_METADATA", () => {
      spyOn(Reflect, "getMetadata").mockImplementation((key) => {
        if (key === PATH_METADATA) return undefined;
        return "some-value";
      });

      const result = (routeFinder as any).exploreMethod(testInstance, testPrototype, "testMethod");

      expect(result).toBeNull();
      (Reflect.getMetadata as any).mockRestore();
    });

    it("should handle array of paths", () => {
      const paths = ["path1", "path2", "path3"];
      spyOn(Reflect, "getMetadata").mockImplementation((key) => {
        if (key === PATH_METADATA) return paths;
        if (key === METHOD_METADATA) return HttpMethod.POST;
        return undefined;
      });

      const result = (routeFinder as any).exploreMethod(testInstance, testPrototype, "testMethod");

      expect(result!.paths).toEqual(["/path1", "/path2", "/path3"]);
      (Reflect.getMetadata as any).mockRestore();
    });

    it("should add leading slash to single string path", () => {
      spyOn(Reflect, "getMetadata").mockImplementation((key) => {
        if (key === PATH_METADATA) return "test";
        if (key === METHOD_METADATA) return HttpMethod.DELETE;
        return undefined;
      });

      const result = (routeFinder as any).exploreMethod(testInstance, testPrototype, "testMethod");

      expect(result!.paths).toEqual(["/test"]);
      (Reflect.getMetadata as any).mockRestore();
    });

    it("should preserve leading slash in single string path", () => {
      spyOn(Reflect, "getMetadata").mockImplementation((key) => {
        if (key === PATH_METADATA) return "/test";
        if (key === METHOD_METADATA) return HttpMethod.PATCH;
        return undefined;
      });

      const result = (routeFinder as any).exploreMethod(testInstance, testPrototype, "testMethod");

      expect(result!.paths).toEqual(["/test"]);
      (Reflect.getMetadata as any).mockRestore();
    });

    it("should handle VERSION_NEUTRAL", () => {
      spyOn(Reflect, "getMetadata").mockImplementation((key) => {
        if (key === PATH_METADATA) return "/test";
        if (key === METHOD_METADATA) return HttpMethod.GET;
        if (key === VERSION_METADATA) return VERSION_NEUTRAL;
        return undefined;
      });

      const result = (routeFinder as any).exploreMethod(testInstance, testPrototype, "testMethod");

      expect(result!.version).toBe(VERSION_NEUTRAL);
      (Reflect.getMetadata as any).mockRestore();
    });

    it("should handle array version", () => {
      const version = ["1.0", "2.0"];
      spyOn(Reflect, "getMetadata").mockImplementation((key) => {
        if (key === PATH_METADATA) return "/test";
        if (key === METHOD_METADATA) return HttpMethod.GET;
        if (key === VERSION_METADATA) return version;
        return undefined;
      });

      const result = (routeFinder as any).exploreMethod(testInstance, testPrototype, "testMethod");

      expect(result!.version).toBe(version);
      (Reflect.getMetadata as any).mockRestore();
    });

    it("should handle undefined version", () => {
      spyOn(Reflect, "getMetadata").mockImplementation((key) => {
        if (key === PATH_METADATA) return "/test";
        if (key === METHOD_METADATA) return HttpMethod.GET;
        if (key === VERSION_METADATA) return undefined;
        return undefined;
      });

      const result = (routeFinder as any).exploreMethod(testInstance, testPrototype, "testMethod");

      expect(result!.version).toBeUndefined();
      (Reflect.getMetadata as any).mockRestore();
    });

    it("should handle all HTTP methods", () => {
      const methods = [
        HttpMethod.GET,
        HttpMethod.POST,
        HttpMethod.PUT,
        HttpMethod.DELETE,
        HttpMethod.PATCH,
        HttpMethod.OPTIONS,
        HttpMethod.HEAD,
        HttpMethod.ALL,
        HttpMethod.SEARCH,
      ];

      methods.forEach(method => {
        spyOn(Reflect, "getMetadata").mockImplementation((key) => {
          if (key === PATH_METADATA) return "/test";
          if (key === METHOD_METADATA) return method;
          return undefined;
        });

        const result = (routeFinder as any).exploreMethod(testInstance, testPrototype, "testMethod");

        expect(result!.requestMethod).toBe(method);
        (Reflect.getMetadata as any).mockRestore();
      });
    });

    it("should handle empty string path", () => {
      spyOn(Reflect, "getMetadata").mockImplementation((key) => {
        if (key === PATH_METADATA) return "";
        if (key === METHOD_METADATA) return HttpMethod.GET;
        return undefined;
      });

      const result = (routeFinder as any).exploreMethod(testInstance, testPrototype, "testMethod");

      expect(result!.paths).toEqual([""]);
      (Reflect.getMetadata as any).mockRestore();
    });

    it("should handle empty array of paths", () => {
      spyOn(Reflect, "getMetadata").mockImplementation((key) => {
        if (key === PATH_METADATA) return [];
        if (key === METHOD_METADATA) return HttpMethod.GET;
        return undefined;
      });

      const result = (routeFinder as any).exploreMethod(testInstance, testPrototype, "testMethod");

      expect(result!.paths).toEqual([]);
      (Reflect.getMetadata as any).mockRestore();
    });

    it("should handle paths that already have leading slash", () => {
      const paths = ["/path1", "/path2"];
      spyOn(Reflect, "getMetadata").mockImplementation((key) => {
        if (key === PATH_METADATA) return paths;
        if (key === METHOD_METADATA) return HttpMethod.GET;
        return undefined;
      });

      const result = (routeFinder as any).exploreMethod(testInstance, testPrototype, "testMethod");

      expect(result!.paths).toEqual(["/path1", "/path2"]);
      (Reflect.getMetadata as any).mockRestore();
    });
  });

  describe("integration scenarios", () => {
    it("should work with real controller class", () => {
      class RealController {
        getUserById() {
          return "user";
        }
        
        createUser() {
          return "created";
        }
        
        updateUser() {
          return "updated";
        }
        
        privateMethod() {
          return "private";
        }
      }

      const instance = new RealController();

      spyOn(Reflect, "getMetadata").mockImplementation((key, target) => {
        const methodName = (target as Function).name;
        
        if (key === PATH_METADATA) {
          switch (methodName) {
            case "getUserById": return "/users/:id";
            case "createUser": return "/users";
            case "updateUser": return "/users/:id";
            case "privateMethod": return undefined; // No route metadata
            default: return undefined;
          }
        }
        
        if (key === METHOD_METADATA) {
          switch (methodName) {
            case "getUserById": return HttpMethod.GET;
            case "createUser": return HttpMethod.POST;
            case "updateUser": return HttpMethod.PUT;
            default: return undefined;
          }
        }
        
        if (key === VERSION_METADATA) {
          return methodName === "updateUser" ? "2.0" : undefined;
        }
        
        return undefined;
      });

      const routes = routeFinder.getControllerRoutes(instance);

      expect(routes).toHaveLength(3);
      
      const getUserRoute = routes.find(r => r.methodName === "getUserById");
      expect(getUserRoute!.paths).toEqual(["/users/:id"]);
      expect(getUserRoute!.requestMethod).toBe(HttpMethod.GET);
      expect(getUserRoute!.version).toBeUndefined();

      const createUserRoute = routes.find(r => r.methodName === "createUser");
      expect(createUserRoute!.paths).toEqual(["/users"]);
      expect(createUserRoute!.requestMethod).toBe(HttpMethod.POST);

      const updateUserRoute = routes.find(r => r.methodName === "updateUser");
      expect(updateUserRoute!.paths).toEqual(["/users/:id"]);
      expect(updateUserRoute!.requestMethod).toBe(HttpMethod.PUT);
      expect(updateUserRoute!.version).toBe("2.0");

      (Reflect.getMetadata as any).mockRestore();
    });

    it("should work with complex controller discovery scenario", () => {
      const mockDiscovery = {
        getVersion: mock(() => VERSION_NEUTRAL),
        getHost: mock(() => [/api\.example\.com/, "localhost:3000"]),
        getPrefixes: mock(() => ["api", "/v2", "users"]),
      } as unknown as ControllerDiscovery;

      const mockConfig = {
        getVersioning: mock(() => ({
          type: "HEADER",
          header: "X-API-Version",
          defaultVersion: ["1.0", "2.0"],
        })),
      } as unknown as HttpConfig;

      const info = routeFinder.getControllerInfo(mockDiscovery, mockConfig);

      expect(info.version).toBe(VERSION_NEUTRAL);
      expect(info.host).toEqual([/api\.example\.com/, "localhost:3000"]);
      expect(info.prefixes).toEqual(["/api", "/v2", "/users"]);
      // @ts-expect-error Mismatch types
      expect(info.versioningOptions).toEqual({
        type: "HEADER",
        header: "X-API-Version",
        defaultVersion: ["1.0", "2.0"],
      });
    });
  });

  describe("edge cases", () => {
    it("should handle null/undefined method names", () => {
      const instance = {};
      const prototype = {};
      
      const scannerSpy = spyOn(metadataScanner, "getAllMethodNames").mockReturnValue(["nonExistentMethod"]);

      spyOn(Reflect, "getMetadata").mockImplementation(() => undefined);

      const routes = routeFinder.getControllerRoutes(instance, prototype);

      expect(routes).toHaveLength(0);
      scannerSpy.mockRestore();
      (Reflect.getMetadata as any).mockRestore();
    });

    it("should handle instance with no constructor", () => {
      const instance = Object.create(null);
      instance.testMethod = () => "test";
      
      const routes = routeFinder.getControllerRoutes(instance as object);
      
      expect(routes).toHaveLength(0);
    });

    it("should handle metadata scanner returning no methods", () => {
      class EmptyController {}
      
      const instance = new EmptyController();
      const scannerSpy = spyOn(metadataScanner, "getAllMethodNames").mockReturnValue([]);
      
      const routes = routeFinder.getControllerRoutes(instance);
      
      expect(routes).toHaveLength(0);
      scannerSpy.mockRestore();
    });

    it("should handle controller discovery with null values", () => {
      const mockDiscovery = {
        getVersion: mock(() => null),
        getHost: mock(() => null),
        getPrefixes: mock(() => null),
      } as unknown as ControllerDiscovery;

      const mockConfig = {
        getVersioning: mock(() => null),
      } as unknown as HttpConfig;

      const info = routeFinder.getControllerInfo(mockDiscovery, mockConfig);

      expect(info.version).toBeUndefined(); // null ?? undefined = undefined
      expect(info.host).toBeNull();
      expect(info.prefixes).toEqual([""]);  // addLeadingSlash(null) -> ""
      expect(info.versioningOptions).toBeNull();
    });

    it("should handle Reflect.getMetadata throwing errors", () => {
      class TestController {
        testMethod() {
          return "test";
        }
      }

      const instance = new TestController();

      spyOn(Reflect, "getMetadata").mockImplementation(() => {
        throw new Error("Reflection error");
      });

      expect(() => {
        routeFinder.getControllerRoutes(instance);
      }).toThrow("Reflection error");

      (Reflect.getMetadata as any).mockRestore();
    });

    it("should handle multiple routes efficiently", () => {
      class MultipleRoutesController {
        method1() {}
        method2() {}
        method3() {}
      }

      const instance = new MultipleRoutesController();

      spyOn(Reflect, "getMetadata").mockImplementation((key, target) => {
        if (key === PATH_METADATA) {
          if (target === MultipleRoutesController.prototype.method1) return "/path1";
          if (target === MultipleRoutesController.prototype.method2) return "/path2";
          if (target === MultipleRoutesController.prototype.method3) return "/path3";
        }
        if (key === METHOD_METADATA) return HttpMethod.GET;
        return undefined;
      });

      const routes = routeFinder.getControllerRoutes(instance);

      expect(routes).toHaveLength(3);
      expect(routes.map(r => r.methodName)).toEqual(["method1", "method2", "method3"]);
      expect(routes.map(r => r.paths[0])).toEqual(["/path1", "/path2", "/path3"]);

      (Reflect.getMetadata as any).mockRestore();
    });
  });
});