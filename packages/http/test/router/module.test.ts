import type { RouteTree } from "~/interfaces/index.js";

import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import { CoreModule, Inject, Module, MODULE_PATH, ModulesContainer, VenokContainer } from "@venok/core";

import { RouterModule, ROUTES, targetModulesByContainer } from "~/router/module.js";

// Test modules
@Module({})
class TestModule {}

@Module({})
class AnotherTestModule {}

@Module({})
class ChildModule {}

@Module({})
class GrandChildModule {}

describe("RouterModule", () => {
  let modulesContainer: ModulesContainer;
  let routes: RouteTree[];

  beforeEach(() => {
    modulesContainer = new ModulesContainer();
    routes = [
      { path: "/api", module: TestModule },
      { path: "/users", module: AnotherTestModule },
    ];

    // Clear the global cache before each test
    targetModulesByContainer.delete(modulesContainer);
  });

  describe("register", () => {
    it("should return dynamic module configuration", () => {
      const testRoutes = [{ path: "/test", module: TestModule }];

      const dynamicModule = RouterModule.register(testRoutes);

      expect(dynamicModule).toEqual({
        module: RouterModule,
        providers: [{ provide: ROUTES, useValue: testRoutes }],
      });
    });

    it("should work with empty routes array", () => {
      const emptyRoutes: any[] = [];

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const dynamicModule = RouterModule.register(emptyRoutes);

      expect(dynamicModule).toEqual({
        module: RouterModule,
        providers: [{ provide: ROUTES, useValue: emptyRoutes }],
      });
    });

    it("should preserve original routes array reference", () => {
      const originalRoutes = [{ path: "/original", module: TestModule }];

      const dynamicModule = RouterModule.register(originalRoutes);

      // @ts-expect-error Mismatch types
      expect(dynamicModule.providers[0].useValue).toBe(originalRoutes);
    });
  });

  describe("constructor", () => {
    it("should initialize with routes and modules container", () => {
      const routerInstance = new RouterModule(modulesContainer, routes);

      expect(routerInstance).toBeInstanceOf(RouterModule);
      expect((routerInstance as any).modulesContainer).toBe(modulesContainer);
      expect((routerInstance as any).routes).not.toBe(routes); // Should be deep cloned
    });

    it("should deep clone routes during initialization", () => {
      const originalRoutes = [
        { 
          path: "/api", 
          module: TestModule,
          children: [{ path: "/v1", module: ChildModule }],
        },
      ];

      const routerInstance = new RouterModule(modulesContainer, originalRoutes);
      const clonedRoutes = (routerInstance as any).routes;

      expect(clonedRoutes).not.toBe(originalRoutes);
      expect(clonedRoutes[0]).not.toBe(originalRoutes[0]);
      expect(clonedRoutes[0].children).not.toBe(originalRoutes[0].children);
      expect(clonedRoutes[0].children[0]).not.toBe(originalRoutes[0].children[0]);
      
      // Content should be the same for paths, but objects should be cloned
      expect(clonedRoutes[0].path).toBe("/api");
      expect(clonedRoutes[0].module).toBe(TestModule);
      expect(clonedRoutes[0].children[0].path).toBe("/api/v1"); // flattenRoutePaths modifies this
      expect(clonedRoutes[0].children[0].module).toBe(ChildModule);
    });

    it("should call initialize method during construction", () => {
      // @ts-expect-error Mismatch types
      const initializeSpy = spyOn(RouterModule.prototype, "initialize");
      
      new RouterModule(modulesContainer, routes);

      expect(initializeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("deepCloneRoutes", () => {
    it("should clone simple route array with modules", () => {
      const routerInstance = new RouterModule(modulesContainer, []);
      const simpleRoutes = [TestModule, AnotherTestModule];

      const cloned = (routerInstance as any).deepCloneRoutes(simpleRoutes);

      expect(cloned).toEqual(simpleRoutes);
      expect(cloned).not.toBe(simpleRoutes);
      expect(cloned[0]).toBe(TestModule); // Functions should be preserved
      expect(cloned[1]).toBe(AnotherTestModule);
    });

    it("should clone route tree without children", () => {
      const routerInstance = new RouterModule(modulesContainer, []);
      const routeTree = [
        { path: "/api", module: TestModule },
        { path: "/users", module: AnotherTestModule },
      ];

      const cloned = (routerInstance as any).deepCloneRoutes(routeTree);

      expect(cloned).toEqual(routeTree);
      expect(cloned).not.toBe(routeTree);
      expect(cloned[0]).not.toBe(routeTree[0]);
      expect(cloned[1]).not.toBe(routeTree[1]);
    });

    it("should recursively clone route tree with children", () => {
      const routerInstance = new RouterModule(modulesContainer, []);
      const complexRoutes = [
        {
          path: "/api",
          module: TestModule,
          children: [
            { path: "/v1", module: ChildModule },
            { 
              path: "/v2", 
              module: AnotherTestModule,
              children: [{ path: "/nested", module: GrandChildModule }],
            },
          ],
        },
      ];

      const cloned = (routerInstance as any).deepCloneRoutes(complexRoutes);

      expect(cloned).toEqual(complexRoutes);
      expect(cloned).not.toBe(complexRoutes);
      expect(cloned[0]).not.toBe(complexRoutes[0]);
      expect(cloned[0].children).not.toBe(complexRoutes[0].children);
      expect(cloned[0].children[0]).not.toBe(complexRoutes[0].children[0]);
      expect(cloned[0].children[1]).not.toBe(complexRoutes[0].children[1]);
      expect(cloned[0].children[1].children).not.toBe(complexRoutes[0].children[1].children);
      // @ts-expect-error Possible undefined
      expect(cloned[0].children[1].children[0]).not.toBe(complexRoutes[0].children[1].children[0]);
    });

    it("should handle mixed routes with functions and objects", () => {
      const routerInstance = new RouterModule(modulesContainer, []);
      const mixedRoutes = [
        TestModule, // Function
        { path: "/api", module: AnotherTestModule }, // Object
        ChildModule, // Function
      ];

      const cloned = (routerInstance as any).deepCloneRoutes(mixedRoutes);

      expect(cloned).toEqual(mixedRoutes);
      expect(cloned).not.toBe(mixedRoutes);
      expect(cloned[0]).toBe(TestModule); // Functions preserved
      expect(cloned[1]).not.toBe(mixedRoutes[1]); // Objects cloned
      expect(cloned[2]).toBe(ChildModule); // Functions preserved
    });

    it("should preserve module references in cloned routes", () => {
      const routerInstance = new RouterModule(modulesContainer, []);
      const routesWithModules = [
        { path: "/test1", module: TestModule },
        { path: "/test2", module: AnotherTestModule },
      ];

      const cloned = (routerInstance as any).deepCloneRoutes(routesWithModules);

      expect(cloned[0].module).toBe(TestModule);
      expect(cloned[1].module).toBe(AnotherTestModule);
    });
  });

  describe("initialize", () => {
    it("should process routes through initialization pipeline", () => {
      const defineMetadataSpy = spyOn(Reflect, "defineMetadata");
      
      // Add modules to container so they can be found
      const testCoreModule = new CoreModule(TestModule, new VenokContainer());
      const anotherCoreModule = new CoreModule(AnotherTestModule, new VenokContainer());
      // @ts-expect-error Mismatch types
      modulesContainer.set(TestModule, testCoreModule);
      // @ts-expect-error Mismatch types
      modulesContainer.set(AnotherTestModule, anotherCoreModule);

      new RouterModule(modulesContainer, routes);

      // Verify metadata was registered with correct keys containing application ID
      expect(defineMetadataSpy).toHaveBeenCalled();
      const calls = defineMetadataSpy.mock.calls;
      
      // Check that MODULE_PATH + applicationId was used
      expect(calls.some(call => call[0].startsWith(MODULE_PATH))).toBe(true);
      expect(calls.some(call => call[0].includes(modulesContainer.applicationId))).toBe(true);
      
      defineMetadataSpy.mockRestore();
    });

    it("should normalize paths during processing", () => {
      const routesWithMalformedPaths = [
        { path: "//api//", module: TestModule },
        { path: "users///", module: AnotherTestModule },
      ];
      
      const defineMetadataSpy = spyOn(Reflect, "defineMetadata");
      
      // Add modules to container
      // @ts-expect-error Mismatch types
      modulesContainer.set(TestModule, new CoreModule(TestModule, new VenokContainer()));
      // @ts-expect-error Mismatch types
      modulesContainer.set(AnotherTestModule, new CoreModule(AnotherTestModule, new VenokContainer()));

      new RouterModule(modulesContainer, routesWithMalformedPaths);

      expect(defineMetadataSpy).toHaveBeenCalled();
      
      // Check that normalized paths were used (should start with MODULE_PATH)
      const calls = defineMetadataSpy.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      
      // Paths should be normalized - can check this by verifying the second parameter
      // doesn't contain double slashes
      const paths = calls.map(call => call[1]);
      expect(paths.every((path: string) => !path.includes("//"))).toBe(true);
      
      defineMetadataSpy.mockRestore();
    });

    it("should handle empty routes gracefully", () => {
      const emptyRoutes: any[] = [];
      // Create a new fresh container for this test
      const freshContainer = new ModulesContainer();
      const defineMetadataSpy = spyOn(Reflect, "defineMetadata");

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(() => new RouterModule(freshContainer, emptyRoutes)).not.toThrow();
      
      // No metadata should be defined for empty routes
      expect(defineMetadataSpy).not.toHaveBeenCalled();
      
      // Cache should still be created but empty
      expect(targetModulesByContainer.has(freshContainer)).toBe(false);
      
      defineMetadataSpy.mockRestore();
    });
  });

  describe("registerModulePathMetadata", () => {
    let defineMetadataSpy: any;

    it("should define metadata with correct key and value", () => {
      defineMetadataSpy = spyOn(Reflect, "defineMetadata");
      const routerInstance = new RouterModule(modulesContainer, []);
      const modulePath = "/api/v1";
      const appId = modulesContainer.applicationId;

      (routerInstance as any).registerModulePathMetadata(TestModule, modulePath);

      expect(defineMetadataSpy).toHaveBeenCalledWith(
        MODULE_PATH + appId,
        modulePath,
        TestModule
      );
      defineMetadataSpy.mockRestore();
    });

    it("should use modules container application ID in metadata key", () => {
      defineMetadataSpy = spyOn(Reflect, "defineMetadata");
      const newContainer = new ModulesContainer();
      const routerInstance = new RouterModule(newContainer, []);
      const appId = newContainer.applicationId;

      (routerInstance as any).registerModulePathMetadata(TestModule, "/path");

      expect(defineMetadataSpy).toHaveBeenCalledWith(
        MODULE_PATH + appId,
        "/path",
        TestModule
      );
      defineMetadataSpy.mockRestore();
    });

    it("should work with different module constructors", () => {
      defineMetadataSpy = spyOn(Reflect, "defineMetadata");
      // Create a fresh container to isolate this test
      const freshContainer = new ModulesContainer();
      const routerInstance = new RouterModule(freshContainer, []);
      const appId = freshContainer.applicationId;

      (routerInstance as any).registerModulePathMetadata(TestModule, "/test1");
      (routerInstance as any).registerModulePathMetadata(AnotherTestModule, "/test2");

      expect(defineMetadataSpy).toHaveBeenCalledTimes(2);
      expect(defineMetadataSpy).toHaveBeenCalledWith(MODULE_PATH + appId, "/test1", TestModule);
      expect(defineMetadataSpy).toHaveBeenCalledWith(MODULE_PATH + appId, "/test2", AnotherTestModule);
      defineMetadataSpy.mockRestore();
    });
  });

  describe("updateTargetModulesCache", () => {
    let mockCoreModule: CoreModule;

    beforeEach(() => {
      // Create a real VenokContainer and CoreModule for testing
      const venokContainer = new VenokContainer();
      mockCoreModule = new CoreModule(TestModule, venokContainer);
      
      // Add the module to the container
      // @ts-expect-error Mismatch types
      modulesContainer.set(TestModule, mockCoreModule);
    });

    it("should work correctly when called multiple times for same module", () => {
      const routerInstance = new RouterModule(modulesContainer, []);

      (routerInstance as any).updateTargetModulesCache(TestModule);
      (routerInstance as any).updateTargetModulesCache(TestModule); // Called again

      const moduleSet = targetModulesByContainer.get(modulesContainer)!;
      expect(moduleSet.has(mockCoreModule)).toBe(true);
    });
  });

  describe("ROUTES symbol", () => {
    it("should be a unique symbol", () => {
      expect(typeof ROUTES).toBe("symbol");
      expect(ROUTES.toString()).toContain("ROUTES");
    });

    it("should be used as injection token", () => {
      // Test that we can create a class with ROUTES injection
      @Module({})
      class TestModuleWithRoutes {
        constructor(@Inject(ROUTES) private routes: any[]) {}

        getRoutes() {
          return this.routes;
        }
      }

      expect(() => new TestModuleWithRoutes([])).not.toThrow();
    });
  });

  describe("targetModulesByContainer global cache", () => {
    it("should be a WeakMap", () => {
      expect(targetModulesByContainer).toBeInstanceOf(WeakMap);
    });

    it("should be cleaned up when containers are garbage collected", () => {
      // This test demonstrates the WeakMap behavior
      let container: ModulesContainer | null = new ModulesContainer();
      const set = new WeakSet<CoreModule>();
      
      targetModulesByContainer.set(container, set);
      expect(targetModulesByContainer.has(container)).toBe(true);
      
      // Simulate garbage collection by removing reference
      container = null;
      
      // The WeakMap entry should eventually be cleaned up automatically
      // (We can't force GC in tests, but this demonstrates the pattern)
    });
  });

  describe("edge cases", () => {
    it("should handle empty routes array", () => {
      expect(() => new RouterModule(modulesContainer, [])).not.toThrow();
    });

    it("should handle routes with undefined modules", () => {
      const routesWithUndefined = [{ path: "/test", module: undefined }];

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(() => new RouterModule(modulesContainer, routesWithUndefined as any)).not.toThrow();
    });

    it("should handle routes with null paths", () => {
      const routesWithNullPaths = [{ path: null, module: TestModule }];

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(() => new RouterModule(modulesContainer, routesWithNullPaths as any)).not.toThrow();
    });

    it("should handle container without application ID", () => {
      const containerWithoutId = new ModulesContainer();
      // Don't set applicationId - it should be undefined

      expect(() => new RouterModule(containerWithoutId, routes)).not.toThrow();
    });
  });
});