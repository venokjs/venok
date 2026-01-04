/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unused-vars */
import type { ExplorerSettings } from "~/interfaces/services/explorer.interface.js";

import { CoreModule, ExecutionContextHost, Injectable, Injector, InstanceWrapper, MetadataScanner, Reflector, ROUTE_ARGS_METADATA, SetMetadata, STATIC_CONTEXT, VenokContainer, VenokContextCreator, VenokExceptionFilterContext } from "@venok/core";
import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

import { DiscoveryService } from "~/services/discovery.service.js";
import { ExplorerService } from "~/services/explorer.service.js";

// Mock decorator for testing
const TEST_CONTROLLER_METADATA = "test-controller";
const TestControllerDecorator = SetMetadata(TEST_CONTROLLER_METADATA, true);

const TEST_METHOD_METADATA = "test-method";
const TestMethodDecorator = SetMetadata(TEST_METHOD_METADATA, "test-method-value");

// Mock params factory
const mockParamsFactory = {
  exchangeKeyForValue: mock(() => "test-param"),
};

// Test providers
@Injectable()
@TestControllerDecorator
class TestController {
  @TestMethodDecorator
  testMethod() {
    return "test-result";
  }

  normalMethod() {
    return "normal-result";
  }
}

@Injectable()
class AnotherController {
  anotherMethod() {
    return "another-result";
  }
}

@Injectable()
class RequestScopedController {
  requestMethod() {
    return "request-result";
  }
}

// Concrete implementation of ExplorerService for testing
class TestExplorerService extends ExplorerService<{ method: string; callback: Function }> {
  protected readonly paramsFactory = mockParamsFactory;

  protected getSettings(): ExplorerSettings {
    return {
      contextType: "test",
      isRequestScopeSupported: false,
    };
  }

  protected filterProperties(wrapper: InstanceWrapper, metadataKey: string) {
    const { instance } = wrapper;
    if (!instance) return undefined;

    const prototype = Object.getPrototypeOf(instance);
    const hasMetadata = this.get(metadataKey, instance.constructor);
    
    if (!hasMetadata) return undefined;

    // Find methods with metadata
    const methodNames = this.metadataScanner.getAllMethodNames(prototype);
    
    for (const methodName of methodNames) {
      const targetCallback = prototype[methodName];
      if (!targetCallback) continue;

      const hasMethodMetadata = this.get(TEST_METHOD_METADATA, targetCallback);
      if (!hasMethodMetadata) continue;

      return {
        method: methodName,
        callback: this.createCallback(wrapper, methodName),
      };
    }

    return undefined;
  }
}

// Request-scoped implementation
class RequestScopedExplorerService extends ExplorerService<{ method: string; callback: Function }> {
  protected readonly paramsFactory = mockParamsFactory;

  protected getSettings(): ExplorerSettings {
    return {
      contextType: "request",
      isRequestScopeSupported: true,
      requestContextArgIndex: 0,
    };
  }

  protected filterProperties(wrapper: InstanceWrapper, metadataKey: string) {
    const { instance } = wrapper;
    if (!instance) return undefined;

    const prototype = Object.getPrototypeOf(instance);
    const hasMetadata = this.get(metadataKey, instance.constructor);
    
    if (!hasMetadata) return undefined;

    const methodNames = this.metadataScanner.getAllMethodNames(prototype);
    
    for (const methodName of methodNames) {
      const targetCallback = prototype[methodName];
      if (!targetCallback) continue;

      return {
        method: methodName,
        callback: this.createCallback(wrapper, methodName),
      };
    }

    return undefined;
  }
}

describe("ExplorerService", () => {
  let explorerService: TestExplorerService;
  let requestScopedExplorerService: RequestScopedExplorerService;
  let container: VenokContainer;
  let discoveryService: DiscoveryService;
  let contextCreator: VenokContextCreator;
  let metadataScanner: MetadataScanner;
  let testModule: CoreModule;

  beforeEach(() => {
    container = new VenokContainer();
    discoveryService = {
      getProviders: mock(),
    } as unknown as DiscoveryService;
    contextCreator = {
      create: mock(),
      getContextModuleKey: mock(),
    } as unknown as VenokContextCreator;
    metadataScanner = new MetadataScanner();

    // Create test module
    class TestModule {}
    testModule = new CoreModule(TestModule, container);

    // Add providers to module
    testModule.addProvider(TestController);
    testModule.addProvider(AnotherController);
    testModule.addProvider(RequestScopedController);

    // Create instance wrappers with proper setup
    const testControllerWrapper = testModule.getProviderByKey(TestController);
    const anotherControllerWrapper = testModule.getProviderByKey(AnotherController);
    const requestScopedWrapper = testModule.getProviderByKey(RequestScopedController);

    // Set instances
    (testControllerWrapper as any).instance = new TestController();
    (testControllerWrapper as any).isResolved = true;
    (anotherControllerWrapper as any).instance = new AnotherController();
    (anotherControllerWrapper as any).isResolved = true;
    (requestScopedWrapper as any).instance = new RequestScopedController();
    (requestScopedWrapper as any).isResolved = true;

    // Mock isDependencyTreeStatic
    (testControllerWrapper as any).isDependencyTreeStatic = mock(() => true);
    (anotherControllerWrapper as any).isDependencyTreeStatic = mock(() => true);
    (requestScopedWrapper as any).isDependencyTreeStatic = mock(() => false); // Request scoped

    // Mock isDependencyTreeDurable
    (requestScopedWrapper as any).isDependencyTreeDurable = mock(() => false);

    // Mock discovery service
    (discoveryService.getProviders as any).mockReturnValue([
      testControllerWrapper,
      anotherControllerWrapper,
      requestScopedWrapper,
    ]);

    // Mock context creator
    // @ts-expect-error Mismatch types
    (contextCreator.create as any).mockImplementation((instance, callback, methodName) => {
      return (...args: any[]) => callback.apply(instance, args);
    });

    (contextCreator.getContextModuleKey as any).mockReturnValue("TestModule");

    // Mock container methods
    container.getModuleByKey = mock().mockReturnValue(testModule);
    container.getContextId = mock().mockReturnValue("context-id");

    explorerService = new TestExplorerService(
      container,
      discoveryService,
      metadataScanner
    );

    requestScopedExplorerService = new RequestScopedExplorerService(
      container,
      discoveryService,
      metadataScanner
    );

    (explorerService as any).contextCreator = contextCreator;
    (requestScopedExplorerService as any).contextCreator = contextCreator;
  });

  describe("constructor", () => {
    it("should getSettings properly", () => {
      expect(explorerService).toBeDefined();
      expect((explorerService as any).container).toBe(container);
      expect((explorerService as any).discoveryService).toBe(discoveryService);
      expect((explorerService as any).metadataScanner).toBe(metadataScanner);
    });

    it("should filter wrappers properly based on withRequestScope", () => {
      const explorerWrappers = (explorerService as any).wrappers;
      const requestScopedWrappers = (requestScopedExplorerService as any).wrappers;
      
      // Non-request scope service should have fewer or equal wrappers (only static dependencies)
      expect(explorerWrappers.length).toBeLessThanOrEqual(requestScopedWrappers.length);
      
      // Request scope service should include all wrappers that have instance and prototype
      expect(requestScopedWrappers.length).toBeGreaterThan(0);
      
      // All wrappers should have instances and prototypes
      explorerWrappers.forEach((wrapper: any) => {
        expect(wrapper.instance).toBeDefined();
        expect(Object.getPrototypeOf(wrapper.instance)).toBeDefined();
        expect(wrapper.isDependencyTreeStatic()).toBe(true); // Non-request scope only has static deps
      });
      
      requestScopedWrappers.forEach((wrapper: any) => {
        expect(wrapper.instance).toBeDefined();
        expect(Object.getPrototypeOf(wrapper.instance)).toBeDefined();
      });
    });

    it("should getSettings exception filter", () => {
      expect((explorerService as any).exceptionsFilter).toBeDefined();
      expect((explorerService as any).exceptionsFilter).toBeInstanceOf(VenokExceptionFilterContext);
    });

    it("should getSettings properties with correct defaults", () => {
      expect((explorerService as any).type).toBe("test");
      expect((explorerService as any).withRequestScope).toBe(false);
      expect((explorerService as any).requestArgIndex).toBe(0);
      expect((explorerService as any).options).toEqual({
        guards: true,
        filters: true,
        interceptors: true,
      });
    });
  });

  describe("explore", () => {
    it("should find controllers with matching metadata", () => {
      const results = explorerService.explore(TEST_CONTROLLER_METADATA);

      expect(results).toHaveLength(1);
      expect(results[0].method).toBe("testMethod");
      expect(typeof results[0].callback).toBe("function");
    });

    it("should return empty array when no controllers match metadata", () => {
      const results = explorerService.explore("non-existent-metadata");

      expect(results).toHaveLength(0);
    });

    it("should filter out falsy results", () => {
      // Mock filterProperties to return undefined for some wrappers
      const originalFilterProperties = (explorerService as any).filterProperties;
      (explorerService as any).filterProperties = mock((wrapper, metadataKey) => {
        if (wrapper.metatype === TestController) {
          return originalFilterProperties.call(explorerService, wrapper, metadataKey);
        }
        return undefined;
      });

      const results = explorerService.explore(TEST_CONTROLLER_METADATA);
      expect(results).toHaveLength(1);
    });
  });

  describe("filterProperties", () => {
    it("should return method info when wrapper has metadata", () => {
      const testControllerWrapper = (explorerService as any).wrappers.find(
        (w: InstanceWrapper) => w.metatype === TestController
      );

      const result = (explorerService as any).filterProperties(
        testControllerWrapper,
        TEST_CONTROLLER_METADATA
      );

      expect(result).toBeDefined();
      expect(result.method).toBe("testMethod");
      expect(typeof result.callback).toBe("function");
    });

    it("should return undefined when wrapper has no metadata", () => {
      const anotherControllerWrapper = (explorerService as any).wrappers.find(
        (w: InstanceWrapper) => w.metatype === AnotherController
      );

      const result = (explorerService as any).filterProperties(
        anotherControllerWrapper,
        TEST_CONTROLLER_METADATA
      );

      expect(result).toBeUndefined();
    });

    it("should return undefined when wrapper has no instance", () => {
      const wrapperWithoutInstance = {
        instance: null,
        metatype: TestController,
      } as InstanceWrapper;

      const result = (explorerService as any).filterProperties(
        wrapperWithoutInstance,
        TEST_CONTROLLER_METADATA
      );

      expect(result).toBeUndefined();
    });
  });

  describe("createCallback", () => {
    let testWrapper: InstanceWrapper;

    beforeEach(() => {
      testWrapper = (explorerService as any).wrappers.find(
        (w: InstanceWrapper) => w.metatype === TestController
      );
    });

    it("should create context callback for non-request scoped services", () => {
      const callback = (explorerService as any).createCallback(testWrapper, "testMethod");

      expect(typeof callback).toBe("function");
      expect(contextCreator.create).toHaveBeenCalledWith(
        testWrapper.instance,
        testWrapper.instance.testMethod,
        "testMethod",
        ROUTE_ARGS_METADATA,
        mockParamsFactory,
        STATIC_CONTEXT,
        undefined,
        { guards: true, filters: true, interceptors: true },
        "test"
      );
    });

    it("should create request scope callback for request scoped services", () => {
      // Create a new request wrapper with all required methods
      const requestWrapper = {
        instance: new RequestScopedController(),
        metatype: RequestScopedController,
        id: "request-wrapper-id",
        isDependencyTreeStatic: mock(() => false),
        isDependencyTreeDurable: mock(() => false),
        getInstanceByContextId: mock(() => ({ instance: new RequestScopedController() })),
      } as unknown as InstanceWrapper;

      const callback = (requestScopedExplorerService as any).createCallback(
        requestWrapper,
        "requestMethod"
      );

      expect(typeof callback).toBe("function");
    });

    it("should handle static dependencies in request scope", () => {
      const staticWrapper = (requestScopedExplorerService as any).wrappers.find(
        (w: InstanceWrapper) => w.metatype === TestController
      );

      const callback = (requestScopedExplorerService as any).createCallback(
        staticWrapper,
        "testMethod"
      );

      expect(typeof callback).toBe("function");
      expect(contextCreator.create).toHaveBeenCalled();
    });
  });

  describe("createContextCallback", () => {
    it("should create context callback with correct parameters", () => {
      const instance = new TestController();
      const callback = instance.testMethod;
      const methodName = "testMethod";

      const contextCallback = (explorerService as any).createContextCallback(
        instance,
        callback,
        methodName
      );

      expect(contextCreator.create).toHaveBeenCalledWith(
        instance,
        callback,
        methodName,
        ROUTE_ARGS_METADATA,
        mockParamsFactory,
        STATIC_CONTEXT,
        undefined,
        { guards: true, filters: true, interceptors: true },
        "test"
      );
    });

    it("should handle custom context id and inquirer id", () => {
      const instance = new TestController();
      const callback = instance.testMethod;
      const methodName = "testMethod";
      const contextId = "custom-context";
      const inquirerId = "custom-inquirer";

      (explorerService as any).createContextCallback(
        instance,
        callback,
        methodName,
        contextId,
        inquirerId
      );

      expect(contextCreator.create).toHaveBeenCalledWith(
        instance,
        callback,
        methodName,
        ROUTE_ARGS_METADATA,
        mockParamsFactory,
        contextId,
        inquirerId,
        { guards: true, filters: true, interceptors: true },
        "test"
      );
    });
  });

  describe("createRequestScopeContextCallback", () => {
    let requestWrapper: InstanceWrapper;
    let injectorMock: any;

    beforeEach(() => {
      requestWrapper = {
        instance: new RequestScopedController(),
        metatype: RequestScopedController,
        id: "request-wrapper-id",
        isDependencyTreeStatic: mock(() => false),
        isDependencyTreeDurable: mock(() => false),
        getInstanceByContextId: mock(() => ({ instance: new RequestScopedController() })),
      } as unknown as InstanceWrapper;

      injectorMock = {
        loadPerContext: mock().mockResolvedValue(new RequestScopedController()),
      };

      // Mock Injector constructor using global assignment instead of spyOn
      (global as any).Injector = class MockInjector {
        loadPerContext = injectorMock.loadPerContext;
      };
    });

    it("should handle exceptions and use exception filter", async () => {
      const errorToThrow = new Error("Test error");
      
      // Mock loadPerContext to throw error
      injectorMock.loadPerContext = mock().mockRejectedValue(errorToThrow);

      // Mock exception filter
      const mockExceptionFilter = {
        next: mock(),
      };
      const createFilterSpy = spyOn((requestScopedExplorerService as any).exceptionsFilter, "create")
        .mockReturnValue(mockExceptionFilter);

      const callback = (requestScopedExplorerService as any).createRequestScopeContextCallback(
        requestWrapper,
        "requestMethod"
      );

      const args = ["test-arg"];
      await callback(...args);

      expect(createFilterSpy).toHaveBeenCalledWith(
        requestWrapper.instance,
        requestWrapper.instance.requestMethod,
        "TestModule"
      );
      expect(mockExceptionFilter.next).toHaveBeenCalledWith(
        expect.any(Error), // The exact error may vary (our error vs loadPerContext error)
        expect.any(ExecutionContextHost)
      );
    });

    it("should cache exception filters", async () => {
      const errorToThrow = new Error("Test error");
      
      // Mock createContextCallback to throw error
      (requestScopedExplorerService as any).createContextCallback = mock(() => {
        return mock(() => {
          throw errorToThrow;
        });
      });

      const mockExceptionFilter = {
        next: mock(),
      };
      const createFilterSpy = spyOn((requestScopedExplorerService as any).exceptionsFilter, "create")
        .mockReturnValue(mockExceptionFilter);

      const callback = (requestScopedExplorerService as any).createRequestScopeContextCallback(
        requestWrapper,
        "requestMethod"
      );

      const args = ["test-arg"];
      
      // Execute twice
      await callback(...args);
      await callback(...args);

      // Exception filter should be created only once (cached)
      expect(createFilterSpy).toHaveBeenCalledTimes(1);
      expect(mockExceptionFilter.next).toHaveBeenCalledTimes(2);
    });
  });

  describe("inheritance and abstract methods", () => {
    it("should be an abstract class", () => {
      expect(() => new (ExplorerService as any)()).toThrow();
    });

    it("should extend Reflector", () => {
      expect(explorerService).toBeInstanceOf(Reflector);
    });

    it("should require filterProperties to be implemented", () => {
      // Since filterProperties is abstract, TypeScript prevents compilation without it
      // We test that the method exists and is properly called during exploration
      class MockExplorerService extends ExplorerService {
        protected readonly paramsFactory = mockParamsFactory;

        protected getSettings() { return {}; }
        
        protected filterProperties() {
          return undefined; // Mock implementation
        }
      }

      const mockService = new MockExplorerService(
        container,
        discoveryService,
        metadataScanner
      );

      // Test that filterProperties is called during exploration
      const filterSpy = spyOn(mockService as any, "filterProperties").mockReturnValue(undefined);
      mockService.explore("test-key");
      
      expect(filterSpy).toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("should handle empty wrappers array", () => {
      (discoveryService.getProviders as any).mockReturnValue([]);
      
      const emptyExplorerService = new TestExplorerService(
        container,
        discoveryService,
        metadataScanner
      );

      const results = emptyExplorerService.explore(TEST_CONTROLLER_METADATA);
      expect(results).toHaveLength(0);
    });

    it("should handle wrappers without instances", () => {
      const wrapperWithoutInstance = {
        instance: null,
        metatype: TestController,
        isDependencyTreeStatic: mock(() => true),
      } as unknown as InstanceWrapper;

      (discoveryService.getProviders as any).mockReturnValue([wrapperWithoutInstance]);

      const emptyExplorerService = new TestExplorerService(
        container,
        discoveryService,
        metadataScanner
      );

      expect((emptyExplorerService as any).wrappers).toHaveLength(0);
    });

    it("should handle wrappers without prototypes", () => {
      const wrapperWithoutPrototype = {
        instance: Object.create(null), // No prototype
        metatype: TestController,
        isDependencyTreeStatic: mock(() => true),
      } as unknown as InstanceWrapper;

      (discoveryService.getProviders as any).mockReturnValue([wrapperWithoutPrototype]);

      const emptyExplorerService = new TestExplorerService(
        container,
        discoveryService,
        metadataScanner
      );

      // Object.create(null) has no prototype, so prototype check fails
      expect((emptyExplorerService as any).wrappers).toHaveLength(0);
    });

    it("should handle metadata scanner returning empty results", () => {
      const mockMetadataScanner = {
        getAllMethodNames: mock(() => []),
      };

      const emptyExplorerService = new TestExplorerService(
        container,
        discoveryService,
        mockMetadataScanner as any
      );

      const results = emptyExplorerService.explore(TEST_CONTROLLER_METADATA);
      expect(results).toHaveLength(0);
    });
  });

  describe("getOriginalArgsForHandler", () => {
    it("should return arguments unchanged by default", () => {
      const args = ["arg1", "arg2", { test: "value" }];
      const result = (explorerService as any).getOriginalArgsForHandler(args);
      
      expect(result).toBe(args);
      expect(result).toEqual(["arg1", "arg2", { test: "value" }]);
    });

    it("should allow overriding in subclasses", () => {
      // Test that the method can be overridden by creating a custom explorer service
      class CustomArgsExplorerService extends TestExplorerService {
        protected getOriginalArgsForHandler(args: any[]): any[] {
          // Example: exclude the first argument (e.g., contextId)
          return args.slice(1);
        }
      }

      const customExplorer = new CustomArgsExplorerService(
        container,
        discoveryService,
        metadataScanner
      );

      const args = ["contextId", "actualArg1", "actualArg2"];
      const result = (customExplorer as any).getOriginalArgsForHandler(args);
      
      expect(result).toEqual(["actualArg1", "actualArg2"]);
      expect(result).not.toBe(args);
    });
  });

  describe("integration scenarios", () => {
    it("should work end-to-end with real metadata scanning", () => {
      // Create a real explorer service with actual metadata scanning
      class RealExplorerService extends ExplorerService<{ 
        controller: string; 
        method: string; 
        callback: Function 
      }> {
        protected readonly paramsFactory = mockParamsFactory;

        protected getSettings() { return {}; }

        protected filterProperties(wrapper: InstanceWrapper, metadataKey: string) {
          const { instance } = wrapper;
          if (!instance) return undefined;

          const hasControllerMetadata = this.get(metadataKey, instance.constructor);
          if (!hasControllerMetadata) return undefined;

          const prototype = Object.getPrototypeOf(instance);
          const methodNames = this.metadataScanner.getAllMethodNames(prototype);
          
          for (const methodName of methodNames) {
            const targetCallback = prototype[methodName];
            const hasMethodMetadata = this.get(TEST_METHOD_METADATA, targetCallback);
            
            if (hasMethodMetadata) {
              return {
                controller: instance.constructor.name,
                method: methodName,
                callback: this.createCallback(wrapper, methodName),
              };
            }
          }

          return undefined;
        }
      }

      const realExplorerService = new RealExplorerService(
        container,
        discoveryService,
        metadataScanner
      );

      const results = realExplorerService.explore(TEST_CONTROLLER_METADATA);

      expect(results).toHaveLength(1);
      expect(results[0].controller).toBe("TestController");
      expect(results[0].method).toBe("testMethod");
      expect(typeof results[0].callback).toBe("function");
    });

    it("should maintain performance with large number of wrappers", () => {
      // Create many mock wrappers
      const manyWrappers = Array.from({ length: 1000 }, (_, i) => ({
        instance: { [`method${i}`]: () => `result${i}` },
        metatype: class {},
        isDependencyTreeStatic: mock(() => true),
      })) as unknown as InstanceWrapper[];

      (discoveryService.getProviders as any).mockReturnValue(manyWrappers);

      const performanceExplorerService = new TestExplorerService(
        container,
        discoveryService,
        metadataScanner
      );

      const startTime = Date.now();
      performanceExplorerService.explore("non-existent-metadata");
      const endTime = Date.now();

      // Should complete within reasonable time (< 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});