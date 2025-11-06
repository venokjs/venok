/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unused-vars */
import { 
  CoreModule, 
  Injector, 
  InstanceWrapper, 
  Injectable, 
  Scope, 
  STATIC_CONTEXT, 
  VenokContainer 
} from "@venok/core";
import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

import { MiddlewareContainer } from "~/middleware/container.js";
import { MiddlewareResolver } from "~/middleware/resolver.js";

// Test middleware classes
@Injectable()
class TestMiddleware {
  public value: string = "test";
  
  use() {
    return `middleware-${this.value}`;
  }
}

@Injectable({ scope: Scope.REQUEST })
class RequestScopedMiddleware {
  public value: string = "request";
  
  use() {
    return `request-${this.value}`;
  }
}

@Injectable()
class AnotherMiddleware {
  constructor(public dependency?: TestMiddleware) {}
  
  use() {
    return "another-middleware";
  }
}

@Injectable()
class MiddlewareWithDependencies {
  constructor(
    public testMiddleware: TestMiddleware,
    public anotherMiddleware: AnotherMiddleware
  ) {}
  
  use() {
    return "middleware-with-deps";
  }
}

describe("MiddlewareResolver", () => {
  let resolver: MiddlewareResolver;
  let middlewareContainer: MiddlewareContainer;
  let injector: Injector;
  let moduleRef: CoreModule;
  let venokContainer: VenokContainer;

  beforeEach(() => {
    middlewareContainer = new MiddlewareContainer();
    injector = new Injector();
    venokContainer = new VenokContainer();
    
    // Create test module
    class TestModule {}
    moduleRef = new CoreModule(TestModule, venokContainer);
    
    resolver = new MiddlewareResolver(middlewareContainer, injector);
  });

  describe("constructor", () => {
    it("should initialize with middleware container and injector", () => {
      expect((resolver as any).middlewareContainer).toBe(middlewareContainer);
      expect((resolver as any).injector).toBe(injector);
    });
  });

  describe("resolveInstances", () => {
    const moduleName = "TestModule";

    beforeEach(() => {
      // Add some middleware to the container
      const config = {
        middleware: [TestMiddleware, AnotherMiddleware],
      };
      // @ts-expect-error Mismatch types
      middlewareContainer.insertConfig([config], moduleName);
    });

    it("should resolve all middleware instances in the module", async () => {
      const middlewareMap = middlewareContainer.getMiddlewareCollection(moduleName);
      
      // Mock injector.loadInstance
      const loadInstanceSpy = spyOn(injector, "loadInstance").mockResolvedValue(undefined);
      
      await resolver.resolveInstances(moduleRef, moduleName);
      
      // Check that loadInstance was called for each middleware
      expect(loadInstanceSpy).toHaveBeenCalledTimes(2);
      
      // Check that instances were created
      const testWrapper = middlewareMap.get(TestMiddleware);
      const anotherWrapper = middlewareMap.get(AnotherMiddleware);
      
      expect(testWrapper?.instance).toBeDefined();
      expect(anotherWrapper?.instance).toBeDefined();
      expect(testWrapper?.instance).toBeInstanceOf(Object);
      expect(anotherWrapper?.instance).toBeInstanceOf(Object);
    });

    it("should handle empty middleware collection", async () => {
      const emptyModuleName = "EmptyModule";
      
      await resolver.resolveInstances(moduleRef, emptyModuleName);
      
      const middlewareMap = middlewareContainer.getMiddlewareCollection(emptyModuleName);
      expect(middlewareMap.size).toBe(0);
    });

    it("should not resolve already resolved instances", async () => {
      const middlewareMap = middlewareContainer.getMiddlewareCollection(moduleName);
      const testWrapper = middlewareMap.get(TestMiddleware)!;
      
      // Pre-set an instance
      const preExistingInstance = new TestMiddleware();
      preExistingInstance.value = "pre-existing";
      testWrapper.instance = preExistingInstance;
      
      const loadInstanceSpy = spyOn(injector, "loadInstance").mockResolvedValue(undefined);
      
      await resolver.resolveInstances(moduleRef, moduleName);
      
      // Should only resolve AnotherMiddleware, not TestMiddleware
      expect(loadInstanceSpy).toHaveBeenCalledTimes(1);
      expect(testWrapper.instance.value).toBe("pre-existing");
    });

    it("should handle injector loadInstance errors gracefully", async () => {
      const error = new Error("Injection failed");
      const loadInstanceSpy = spyOn(injector, "loadInstance").mockRejectedValue(error);
      
      await expect(resolver.resolveInstances(moduleRef, moduleName)).rejects.toThrow("Injection failed");
      
      expect(loadInstanceSpy).toHaveBeenCalled();
    });

    it("should resolve instances in parallel", async () => {
      // Add more middleware to test parallel resolution
      const config = {
        middleware: [RequestScopedMiddleware, MiddlewareWithDependencies],
      };
      // @ts-expect-error Mismatch types
      middlewareContainer.insertConfig([config], moduleName);
      
      const middlewareMap = middlewareContainer.getMiddlewareCollection(moduleName);
      const startTime = Date.now();
      
      // Mock loadInstance with delay to simulate async work
      const loadInstanceSpy = spyOn(injector, "loadInstance").mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 10))
      );
      
      await resolver.resolveInstances(moduleRef, moduleName);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete in less time than sequential execution
      // With 4 middleware and 10ms each, sequential would be 40ms+
      expect(duration).toBeLessThan(30);
      expect(loadInstanceSpy).toHaveBeenCalledTimes(4);
    });
  });

  describe("resolveMiddlewareInstance", () => {
    const moduleName = "TestModule";
    let middlewareMap: Map<any, InstanceWrapper>;
    let testWrapper: InstanceWrapper;

    beforeEach(() => {
      const config = {
        middleware: [TestMiddleware],
      };
      // @ts-expect-error Mismatch types
      middlewareContainer.insertConfig([config], moduleName);
      middlewareMap = middlewareContainer.getMiddlewareCollection(moduleName);
      testWrapper = middlewareMap.get(TestMiddleware)!;
    });

    it("should create instance prototype and call injector.loadInstance", async () => {
      const loadInstanceSpy = spyOn(injector, "loadInstance").mockResolvedValue(undefined);
      
      await (resolver as any).resolveMiddlewareInstance(testWrapper, middlewareMap, moduleRef);
      
      expect(testWrapper.instance).toBeDefined();
      expect(Object.getPrototypeOf(testWrapper.instance)).toBe(TestMiddleware.prototype);
      expect(loadInstanceSpy).toHaveBeenCalledWith(
        testWrapper,
        middlewareMap,
        moduleRef,
        STATIC_CONTEXT,
        testWrapper
      );
    });

    it("should not resolve if wrapper is not found in map", async () => {
      // Create a wrapper that's not in the map
      const orphanWrapper = new InstanceWrapper({
        name: "OrphanMiddleware",
        metatype: class OrphanMiddleware {},
        token: "OrphanMiddleware",
      });
      
      const loadInstanceSpy = spyOn(injector, "loadInstance").mockResolvedValue(undefined);
      
      await (resolver as any).resolveMiddlewareInstance(orphanWrapper, middlewareMap, moduleRef);
      
      expect(loadInstanceSpy).not.toHaveBeenCalled();
    });

    it("should not resolve if instance already exists", async () => {
      // Pre-set instance
      const existingInstance = new TestMiddleware();
      existingInstance.value = "existing";
      testWrapper.instance = existingInstance;
      
      const loadInstanceSpy = spyOn(injector, "loadInstance").mockResolvedValue(undefined);
      
      await (resolver as any).resolveMiddlewareInstance(testWrapper, middlewareMap, moduleRef);
      
      expect(loadInstanceSpy).not.toHaveBeenCalled();
      expect(testWrapper.instance.value).toBe("existing");
    });

    it("should handle undefined metatype gracefully", async () => {
      const wrapperWithoutMetatype = new InstanceWrapper({
        name: "NoMetatype",
        metatype: undefined as any,
        token: "NoMetatype",
      });
      
      middlewareMap.set("NoMetatype", wrapperWithoutMetatype);
      
      const loadInstanceSpy = spyOn(injector, "loadInstance").mockResolvedValue(undefined);
      
      await expect(
        (resolver as any).resolveMiddlewareInstance(wrapperWithoutMetatype, middlewareMap, moduleRef)
      ).rejects.toThrow();
    });

    it("should handle circular dependencies", async () => {
      // Create circular dependency scenario
      class CircularA {
        constructor(public b: CircularB) {}
      }
      
      class CircularB {
        constructor(public a: CircularA) {}
      }
      
      const wrapperA = new InstanceWrapper({
        name: "CircularA",
        metatype: CircularA,
        token: CircularA,
      });
      
      const wrapperB = new InstanceWrapper({
        name: "CircularB",
        metatype: CircularB,
        token: CircularB,
      });
      
      middlewareMap.set(CircularA, wrapperA);
      middlewareMap.set(CircularB, wrapperB);
      
      const loadInstanceSpy = spyOn(injector, "loadInstance").mockImplementation(
        async (wrapper) => {
          // Simulate circular dependency error
          if (wrapper.metatype === CircularA || wrapper.metatype === CircularB) {
            throw new Error("Circular dependency detected");
          }
        }
      );
      
      await expect(
        (resolver as any).resolveMiddlewareInstance(wrapperA, middlewareMap, moduleRef)
      ).rejects.toThrow("Circular dependency detected");
    });

    it("should pass correct parameters to injector.loadInstance", async () => {
      const loadInstanceSpy = spyOn(injector, "loadInstance").mockResolvedValue(undefined);
      
      await (resolver as any).resolveMiddlewareInstance(testWrapper, middlewareMap, moduleRef);
      
      expect(loadInstanceSpy).toHaveBeenCalledWith(
        testWrapper,
        middlewareMap,
        moduleRef,
        STATIC_CONTEXT,
        testWrapper
      );
    });
  });

  describe("integration scenarios", () => {
    it("should resolve complex middleware dependencies", async () => {
      const moduleName = "ComplexModule";
      
      // Setup complex dependency chain: MiddlewareWithDependencies -> TestMiddleware, AnotherMiddleware
      const config = {
        middleware: [TestMiddleware, AnotherMiddleware, MiddlewareWithDependencies],
      };
      // @ts-expect-error Mismatch types
      middlewareContainer.insertConfig([config], moduleName);
      
      const loadInstanceSpy = spyOn(injector, "loadInstance").mockResolvedValue(undefined);
      
      await resolver.resolveInstances(moduleRef, moduleName);
      
      const middlewareMap = middlewareContainer.getMiddlewareCollection(moduleName);
      const complexWrapper = middlewareMap.get(MiddlewareWithDependencies);
      
      expect(loadInstanceSpy).toHaveBeenCalledTimes(3);
      expect(complexWrapper?.instance).toBeDefined();
      expect(Object.getPrototypeOf(complexWrapper?.instance)).toBe(MiddlewareWithDependencies.prototype);
    });

    it("should handle mixed scope middleware", async () => {
      const moduleName = "MixedScopeModule";
      
      const config = {
        middleware: [TestMiddleware, RequestScopedMiddleware],
      };
      // @ts-expect-error Mismatch types
      middlewareContainer.insertConfig([config], moduleName);
      
      const loadInstanceSpy = spyOn(injector, "loadInstance").mockResolvedValue(undefined);
      
      await resolver.resolveInstances(moduleRef, moduleName);
      
      const middlewareMap = middlewareContainer.getMiddlewareCollection(moduleName);
      const singletonWrapper = middlewareMap.get(TestMiddleware);
      const requestWrapper = middlewareMap.get(RequestScopedMiddleware);
      
      expect(singletonWrapper?.instance).toBeDefined();
      expect(requestWrapper?.instance).toBeDefined();
      expect(loadInstanceSpy).toHaveBeenCalledTimes(2);
    });

    it("should work with real module and container setup", async () => {
      const moduleName = "RealModule";
      
      // Create a more realistic scenario
      class AuthModule {}
      const authModule = new CoreModule(AuthModule, venokContainer);
      
      const authConfig = {
        middleware: [TestMiddleware, AnotherMiddleware],
      };
      // @ts-expect-error Mismatch types
      middlewareContainer.insertConfig([authConfig], moduleName);
      
      // Mock injector for this test to avoid real dependency injection issues
      const loadInstanceSpy = spyOn(injector, "loadInstance").mockResolvedValue(undefined);
      
      await resolver.resolveInstances(authModule, moduleName);
      
      const middlewareMap = middlewareContainer.getMiddlewareCollection(moduleName);
      const testWrapper = middlewareMap.get(TestMiddleware);
      const anotherWrapper = middlewareMap.get(AnotherMiddleware);
      
      expect(testWrapper?.instance).toBeDefined();
      expect(anotherWrapper?.instance).toBeDefined();
      expect(loadInstanceSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("edge cases", () => {
    it("should handle empty middleware map gracefully", async () => {
      const emptyModuleName = "EmptyModule";
      
      // This should not throw since empty collections are handled gracefully
      await resolver.resolveInstances(moduleRef, emptyModuleName);
      
      const middlewareMap = middlewareContainer.getMiddlewareCollection(emptyModuleName);
      expect(middlewareMap.size).toBe(0);
    });

    it("should handle wrapper with missing token", async () => {
      const moduleName = "MissingTokenModule";
      const middlewareMap = middlewareContainer.getMiddlewareCollection(moduleName);
      
      const wrapperWithoutToken = new InstanceWrapper({
        name: "NoToken",
        metatype: TestMiddleware,
        token: undefined as any,
      });
      
      middlewareMap.set(undefined as any, wrapperWithoutToken);
      
      const loadInstanceSpy = spyOn(injector, "loadInstance").mockResolvedValue(undefined);
      
      await resolver.resolveInstances(moduleRef, moduleName);
      
      // Should call loadInstance because wrapper is found in map with undefined token
      expect(loadInstanceSpy).toHaveBeenCalledTimes(1);
    });

    it("should handle concurrent resolution attempts", async () => {
      const moduleName = "ConcurrentModule";
      
      const config = {
        middleware: [TestMiddleware],
      };
      // @ts-expect-error Mismatch types
      middlewareContainer.insertConfig([config], moduleName);
      
      const loadInstanceSpy = spyOn(injector, "loadInstance").mockResolvedValue(undefined);
      
      // Start multiple resolution attempts simultaneously
      const resolutions = [
        resolver.resolveInstances(moduleRef, moduleName),
        resolver.resolveInstances(moduleRef, moduleName),
        resolver.resolveInstances(moduleRef, moduleName),
      ];
      
      await Promise.all(resolutions);
      
      // Due to the instance check, loadInstance should only be called once
      expect(loadInstanceSpy).toHaveBeenCalledTimes(1);
    });

    it("should preserve instance prototype chain", async () => {
      const moduleName = "PrototypeModule";
      
      const config = {
        middleware: [TestMiddleware],
      };
      // @ts-expect-error Mismatch types
      middlewareContainer.insertConfig([config], moduleName);
      
      const loadInstanceSpy = spyOn(injector, "loadInstance").mockResolvedValue(undefined);
      
      await resolver.resolveInstances(moduleRef, moduleName);
      
      const middlewareMap = middlewareContainer.getMiddlewareCollection(moduleName);
      const wrapper = middlewareMap.get(TestMiddleware);
      
      expect(wrapper?.instance).toBeInstanceOf(Object);
      expect(Object.getPrototypeOf(wrapper?.instance)).toBe(TestMiddleware.prototype);
      expect(wrapper?.instance.constructor).toBe(TestMiddleware);
    });

    it("should handle null/undefined module reference", async () => {
      const moduleName = "NullModule";
      
      const config = {
        middleware: [TestMiddleware],
      };
      // @ts-expect-error Mismatch types
      middlewareContainer.insertConfig([config], moduleName);
      
      const loadInstanceSpy = spyOn(injector, "loadInstance").mockResolvedValue(undefined);
      
      await resolver.resolveInstances(null as any, moduleName);
      
      expect(loadInstanceSpy).toHaveBeenCalledWith(
        expect.any(InstanceWrapper),
        expect.any(Map),
        null,
        STATIC_CONTEXT,
        expect.any(InstanceWrapper)
      );
    });
  });

  describe("performance", () => {
    it("should handle large number of middleware efficiently", async () => {
      const moduleName = "LargeModule";
      const middlewareCount = 100;
      
      // Create many middleware classes
      const middlewareClasses = Array.from({ length: middlewareCount }, (_, i) => {
        return class {
          // @ts-expect-error Mismatch types
          static name = `Middleware${i}`;
          use() {
            return `middleware-${i}`;
          }
        };
      });
      
      const config = {
        middleware: middlewareClasses as any,
      };
      // @ts-expect-error Mismatch types
      middlewareContainer.insertConfig([config], moduleName);
      
      const loadInstanceSpy = spyOn(injector, "loadInstance").mockResolvedValue(undefined);
      
      const startTime = Date.now();
      await resolver.resolveInstances(moduleRef, moduleName);
      const endTime = Date.now();
      
      expect(loadInstanceSpy).toHaveBeenCalledTimes(middlewareCount);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it("should not create unnecessary objects", async () => {
      const moduleName = "MemoryModule";
      
      const config = {
        middleware: [TestMiddleware],
      };
      // @ts-expect-error Mismatch types
      middlewareContainer.insertConfig([config], moduleName);
      
      const middlewareMap = middlewareContainer.getMiddlewareCollection(moduleName);
      const wrapper = middlewareMap.get(TestMiddleware)!;
      
      // Resolve once
      const loadInstanceSpy = spyOn(injector, "loadInstance").mockResolvedValue(undefined);
      await resolver.resolveInstances(moduleRef, moduleName);
      
      const firstInstance = wrapper.instance;
      
      // Resolve again
      await resolver.resolveInstances(moduleRef, moduleName);
      
      // Should be the same instance
      expect(wrapper.instance).toBe(firstInstance);
      expect(loadInstanceSpy).toHaveBeenCalledTimes(1);
    });
  });
});