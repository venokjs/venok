/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unused-vars */
import type { BaseMiddlewareConfiguration, VenokMiddleware } from "~/interfaces/index.js";

import { CoreModule, ExecutionContextHost, Injectable, Injector, InstanceWrapper, Logger, RuntimeException, Scope, STATIC_CONTEXT, VenokContainer, VenokExceptionFilterContext, VenokProxy } from "@venok/core";
import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

import { InvalidMiddlewareException } from "~/exceptions/invalid-middleware.exception.js";
import { MiddlewareContainer } from "~/middleware/container.js";
import { MiddlewareResolver } from "~/middleware/resolver.js";
import { MiddlewareService } from "~/middleware/service.js";

// Mock middleware builder
class MockMiddlewareBuilder {
  private config: TestMiddlewareConfiguration[] = [];

  apply(middleware: any) {
    const config: TestMiddlewareConfiguration = {
      middleware: Array.isArray(middleware) ? middleware : [middleware],
      to: [],
    };
    this.config.push(config);
    return {
      forRoutes: (...routes: any[]) => {
        config.to = routes;
        return this;
      },
    };
  }

  build() {
    return this.config;
  }
}

// Test middleware configuration
interface TestMiddlewareConfiguration extends BaseMiddlewareConfiguration {
  to: string[];
}

// Test middleware classes
@Injectable()
class TestMiddleware implements VenokMiddleware {
  use() {
    return "test-middleware";
  }
}

@Injectable({ scope: Scope.REQUEST })
class RequestScopedMiddleware implements VenokMiddleware {
  use() {
    return "request-scoped";
  }
}

@Injectable()
class MiddlewareWithoutUse {
  // Missing use method
}

@Injectable()
class TransientMiddleware implements VenokMiddleware {
  use() {
    return "transient";
  }
}

// Test modules
class TestModule {
  configure(builder: MockMiddlewareBuilder) {
    builder.apply([TestMiddleware]).forRoutes("test-route");
  }
}

class ModuleWithoutConfigure {}

class ModuleWithException {
  configure(builder: MockMiddlewareBuilder) {
    throw new Error("Configuration error");
  }
}

class RequestScopedModule {
  configure(builder: MockMiddlewareBuilder) {
    builder.apply([RequestScopedMiddleware]).forRoutes("request-route");
  }
}

// Concrete implementation for testing
class TestMiddlewareService extends MiddlewareService<TestMiddlewareConfiguration> {
  protected readonly registeredHandlers: Array<{ to: string; proxy: Function }> = [];

  protected getMiddlewareBuilder() {
    return new MockMiddlewareBuilder();
  }

  protected async registerHandler(info: string, proxy: Function) {
    this.registeredHandlers.push({ to: info, proxy });
  }

  // Expose protected methods for testing
  public async testCreateCallback(
    wrapper: InstanceWrapper<VenokMiddleware>,
    moduleRef: CoreModule,
    collection: Map<any, InstanceWrapper>
  ) {
    return this.createCallback(wrapper, moduleRef, collection);
  }

  public getRegisteredHandlers() {
    return this.registeredHandlers;
  }
}

describe("MiddlewareService", () => {
  let service: TestMiddlewareService;
  let container: VenokContainer;
  let testModule: CoreModule;
  let requestModule: CoreModule;

  beforeEach(() => {
    container = new VenokContainer();
    service = new TestMiddlewareService(container);
    
    // Create test modules
    testModule = new CoreModule(TestModule, container);
    requestModule = new CoreModule(RequestScopedModule, container);
    
    // Add modules to container
    container.addModule(TestModule, []);
    container.addModule(RequestScopedModule, []);
    
    // Setup module instances using Object.defineProperty since instance is readonly
    Object.defineProperty(testModule, "instance", {
      value: new TestModule(),
      writable: true,
      configurable: true,
    });
    Object.defineProperty(requestModule, "instance", {
      value: new RequestScopedModule(),
      writable: true,
      configurable: true,
    });
    
    // Mock container methods
    container.getModuleByKey = mock((key: string) => {
      if (key === "TestModule") return testModule;
      if (key === "RequestScopedModule") return requestModule;
      return testModule;
    });

    // @ts-expect-error Mismatch types
    container.getContextId = mock(() => "context-id");
  });

  describe("constructor", () => {
    it("should initialize with container and create necessary instances", () => {
      expect(service.container).toBe(container);
      expect((service as any).middlewareContainer).toBeInstanceOf(MiddlewareContainer);
      expect((service as any).resolver).toBeInstanceOf(MiddlewareResolver);
      expect((service as any).injector).toBeInstanceOf(Injector);
      expect((service as any).logger).toBeInstanceOf(Logger);
      expect((service as any).exceptionsFilter).toBeInstanceOf(VenokExceptionFilterContext);
    });

    it("should set correct default values", () => {
      expect((service as any).index).toBe(0);
      expect((service as any).type).toBe("native");
      expect((service as any).venokProxy).toBeInstanceOf(VenokProxy);
      expect((service as any).exceptionFiltersCache).toBeInstanceOf(WeakMap);
    });
  });

  describe("explore", () => {
    it("should explore all modules and load configurations", async () => {
      // Mock container.getModules()
      const modulesMap = new Map([
        ["TestModule", testModule],
        ["RequestScopedModule", requestModule],
      ]);
      // @ts-expect-error Mismatch types
      container.getModules = mock(() => modulesMap);

      // Mock loadConfiguration and resolver
      const loadConfigSpy = spyOn(service as any, "loadConfiguration").mockResolvedValue(undefined);
      const resolveInstancesSpy = spyOn((service as any).resolver, "resolveInstances").mockResolvedValue(undefined);

      await service.explore(TestModule);

      expect(loadConfigSpy).toHaveBeenCalledTimes(2);
      expect(resolveInstancesSpy).toHaveBeenCalledTimes(2);
      expect(loadConfigSpy).toHaveBeenCalledWith(testModule, "TestModule", TestModule);
      expect(loadConfigSpy).toHaveBeenCalledWith(requestModule, "RequestScopedModule", TestModule);
    });

    it("should handle empty modules", async () => {
      // @ts-expect-error Mismatch types
      container.getModules = mock(() => new Map());

      const loadConfigSpy = spyOn(service as any, "loadConfiguration").mockResolvedValue(undefined);
      
      await service.explore(TestModule);

      expect(loadConfigSpy).not.toHaveBeenCalled();
    });
  });

  describe("loadConfiguration", () => {
    let middlewareBuilder: MockMiddlewareBuilder;

    beforeEach(() => {
      middlewareBuilder = new MockMiddlewareBuilder();
      spyOn(service as any, "getMiddlewareBuilder").mockReturnValue(middlewareBuilder);
    });

    it("should load configuration for modules with configure method", async () => {
      const insertConfigSpy = spyOn((service as any).middlewareContainer, "insertConfig").mockImplementation(() => {});

      await (service as any).loadConfiguration(testModule, "TestModule", TestModule);

      expect(insertConfigSpy).toHaveBeenCalledWith(
        expect.any(Array),
        "TestModule"
      );
    });

    it("should skip modules without configure method", async () => {
      const moduleWithoutConfigure = new CoreModule(ModuleWithoutConfigure, container);
      Object.defineProperty(moduleWithoutConfigure, "instance", {
        value: new ModuleWithoutConfigure(),
        writable: true,
        configurable: true,
      });

      const insertConfigSpy = spyOn((service as any).middlewareContainer, "insertConfig").mockImplementation(() => {});

      await (service as any).loadConfiguration(moduleWithoutConfigure, "ModuleWithoutConfigure", TestModule);

      expect(insertConfigSpy).not.toHaveBeenCalled();
    });

    it("should skip modules that are not instances of middlewareClass", async () => {
      const insertConfigSpy = spyOn((service as any).middlewareContainer, "insertConfig").mockImplementation(() => {});

      await (service as any).loadConfiguration(testModule, "TestModule", RequestScopedModule);

      expect(insertConfigSpy).not.toHaveBeenCalled();
    });

    it("should handle configuration errors and log warnings", async () => {
      const moduleWithException = new CoreModule(ModuleWithException, container);
      Object.defineProperty(moduleWithException, "instance", {
        value: new ModuleWithException(),
        writable: true,
        configurable: true,
      });

      const loggerWarnSpy = spyOn((service as any).logger, "warn").mockImplementation(() => {});

      await expect(
        (service as any).loadConfiguration(moduleWithException, "ModuleWithException", ModuleWithException)
      ).rejects.toThrow("Configuration error");

      expect(loggerWarnSpy).toHaveBeenCalled();
    });
  });

  describe("build", () => {
    beforeEach(() => {
      // Setup middleware container with test data
      const config: TestMiddlewareConfiguration = {
        middleware: [TestMiddleware],
        to: ["test-route"],
      };
      
      (service as any).middlewareContainer.insertConfig([config], "TestModule");
    });

    it("should build and register all configurations", async () => {
      // Mock distance for sorting
      testModule.distance = 1;
      
      const registerConfigSpy = spyOn(service as any, "registerConfig").mockResolvedValue(undefined);

      await service.build();

      expect(registerConfigSpy).toHaveBeenCalled();
    });

    it("should sort modules by distance", async () => {
      // Add another module with different distance
      const config2: TestMiddlewareConfiguration = {
        middleware: [RequestScopedMiddleware],
        to: ["request-route"],
      };
      (service as any).middlewareContainer.insertConfig([config2], "RequestScopedModule");

      testModule.distance = 2;
      requestModule.distance = 1;

      const registerConfigSpy = spyOn(service as any, "registerConfig").mockResolvedValue(undefined);

      await service.build();

      expect(registerConfigSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("registerConfig", () => {
    it("should register middleware for each target", async () => {
      const config: TestMiddlewareConfiguration = {
        middleware: [TestMiddleware],
        to: ["route1", "route2"],
      };

      const registerMiddlewareSpy = spyOn(service as any, "registerMiddleware").mockResolvedValue(undefined);

      await (service as any).registerConfig(config, "TestModule");

      expect(registerMiddlewareSpy).toHaveBeenCalledTimes(2);
      expect(registerMiddlewareSpy).toHaveBeenCalledWith("route1", "TestModule", config);
      expect(registerMiddlewareSpy).toHaveBeenCalledWith("route2", "TestModule", config);
    });
  });

  describe("registerMiddleware", () => {
    let middlewareCollection: Map<any, InstanceWrapper>;

    beforeEach(() => {
      // Setup middleware in container
      const config: TestMiddlewareConfiguration = {
        middleware: [TestMiddleware],
        to: ["test-route"],
      };
      (service as any).middlewareContainer.insertConfig([config], "TestModule");
      middlewareCollection = (service as any).middlewareContainer.getMiddlewareCollection("TestModule");
    });

    it("should register middleware and create callback", async () => {
      const createCallbackSpy = spyOn(service as any, "createCallback").mockResolvedValue(() => "proxy");
      // @ts-expect-error Mismatch types
      const registerHandlerSpy = spyOn(service, "registerHandler").mockResolvedValue(undefined);

      const config = {
        middleware: [TestMiddleware],
      };

      await (service as any).registerMiddleware("test-route", "TestModule", config);

      expect(createCallbackSpy).toHaveBeenCalled();
      expect(registerHandlerSpy).toHaveBeenCalledWith("test-route", expect.any(Function));
    });

    it("should throw RuntimeException if middleware wrapper not found", () => {
      const config = {
        middleware: [class NonExistentMiddleware {}],
      };

      expect((service as any).registerMiddleware("test-route", "TestModule", config)).rejects.toThrow(RuntimeException);
    });

    it("should skip transient middleware", async () => {
      // Setup transient middleware
      const transientWrapper = new InstanceWrapper({
        name: "TransientMiddleware",
        metatype: TransientMiddleware,
        token: TransientMiddleware,
      });
      
      // Mock isTransient using Object.defineProperty since it's readonly
      Object.defineProperty(transientWrapper, "isTransient", {
        value: true,
        writable: false,
        configurable: true,
      });
      
      middlewareCollection.set(TransientMiddleware, transientWrapper);

      const createCallbackSpy = spyOn(service as any, "createCallback").mockResolvedValue(() => "proxy");
      // @ts-expect-error Mismatch types
      const registerHandlerSpy = spyOn(service, "registerHandler").mockResolvedValue(undefined);

      const config = {
        middleware: [TransientMiddleware],
      };

      await (service as any).registerMiddleware("test-route", "TestModule", config);

      expect(createCallbackSpy).not.toHaveBeenCalled();
      expect(registerHandlerSpy).not.toHaveBeenCalled();
    });
  });

  describe("createCallback", () => {
    let testWrapper: InstanceWrapper<VenokMiddleware>;
    let middlewareCollection: Map<any, InstanceWrapper>;

    beforeEach(() => {
      // Setup test wrapper
      testWrapper = new InstanceWrapper({
        name: "TestMiddleware",
        metatype: TestMiddleware,
        token: TestMiddleware,
      });
      testWrapper.instance = new TestMiddleware();
      testWrapper.isDependencyTreeStatic = mock(() => true);
      testWrapper.isDependencyTreeDurable = mock(() => false);

      middlewareCollection = new Map();
      middlewareCollection.set(TestMiddleware, testWrapper);
    });

    it("should throw InvalidMiddlewareException if use method is missing", () => {
      const wrapperWithoutUse = new InstanceWrapper({
        name: "MiddlewareWithoutUse",
        metatype: MiddlewareWithoutUse,
        token: MiddlewareWithoutUse,
      });
      wrapperWithoutUse.instance = new MiddlewareWithoutUse();

      expect(
        service.testCreateCallback(wrapperWithoutUse as any, testModule, middlewareCollection)
      ).rejects.toThrow(InvalidMiddlewareException);
    });

    it("should create static callback for static dependencies", async () => {
      const createProxySpy = spyOn(service as any, "createProxy").mockResolvedValue(() => "static-proxy");

      const callback = await service.testCreateCallback(testWrapper, testModule, middlewareCollection);

      expect(createProxySpy).toHaveBeenCalledWith(testWrapper.instance);
      expect(callback).toEqual(expect.any(Function));
    });

    it("should create dynamic callback for non-static dependencies", async () => {
      testWrapper.isDependencyTreeStatic = mock(() => false);
      testWrapper.isDependencyTreeDurable = mock(() => true);

      const createProxySpy = spyOn(service as any, "createProxy").mockResolvedValue(() => "dynamic-proxy");
      const loadPerContextSpy = spyOn((service as any).injector, "loadPerContext").mockResolvedValue(new TestMiddleware());

      const callback = await service.testCreateCallback(testWrapper, testModule, middlewareCollection);

      expect(callback).toEqual(expect.any(Function));

      // Test the dynamic callback
      const result = await callback("test-arg");

      expect(container.getContextId).toHaveBeenCalledWith("test-arg", true);
      expect(loadPerContextSpy).toHaveBeenCalled();
      expect(createProxySpy).toHaveBeenCalledTimes(1);
    });

    it("should handle exceptions in dynamic callback", async () => {
      testWrapper.isDependencyTreeStatic = mock(() => false);

      const loadPerContextSpy = spyOn((service as any).injector, "loadPerContext").mockRejectedValue(new Error("Load error"));
      const createExceptionHandlerSpy = spyOn((service as any).exceptionsFilter, "create").mockReturnValue({
        next: mock(),
      });

      const callback = await service.testCreateCallback(testWrapper, testModule, middlewareCollection);

      await callback("test-arg");

      expect(createExceptionHandlerSpy).toHaveBeenCalled();
    });

    it("should cache exception handlers", async () => {
      testWrapper.isDependencyTreeStatic = mock(() => false);

      const loadPerContextSpy = spyOn((service as any).injector, "loadPerContext").mockRejectedValue(new Error("Load error"));
      const mockExceptionHandler = { next: mock() };
      const createExceptionHandlerSpy = spyOn((service as any).exceptionsFilter, "create").mockReturnValue(mockExceptionHandler);

      const callback = await service.testCreateCallback(testWrapper, testModule, middlewareCollection);

      // Call twice to test caching
      await callback("test-arg");
      await callback("test-arg");

      expect(createExceptionHandlerSpy).toHaveBeenCalledTimes(1); // Should be cached
      expect(mockExceptionHandler.next).toHaveBeenCalledTimes(2);
    });
  });

  describe("createProxy", () => {
    let testMiddleware: TestMiddleware;

    beforeEach(() => {
      testMiddleware = new TestMiddleware();
    });

    it("should create proxy with exception handler", async () => {
      const mockExceptionHandler = { next: mock() };
      const createExceptionHandlerSpy = spyOn((service as any).exceptionsFilter, "create").mockReturnValue(mockExceptionHandler);
      const venokProxySpy = spyOn((service as any).venokProxy, "createProxy").mockReturnValue(() => "proxied");

      const proxy = await (service as any).createProxy(testMiddleware);

      expect(createExceptionHandlerSpy).toHaveBeenCalledWith(
        testMiddleware,
        expect.any(Function),
        undefined,
        STATIC_CONTEXT
      );
      expect(venokProxySpy).toHaveBeenCalledWith(
        expect.any(Function),
        mockExceptionHandler,
        "native"
      );
      expect(proxy).toEqual(expect.any(Function));
    });

    it("should create proxy with custom context id", async () => {
      const customContextId = "custom-context";
      const createExceptionHandlerSpy = spyOn((service as any).exceptionsFilter, "create").mockReturnValue({ next: mock() });

      await (service as any).createProxy(testMiddleware, customContextId);

      expect(createExceptionHandlerSpy).toHaveBeenCalledWith(
        testMiddleware,
        expect.any(Function),
        undefined,
        customContextId
      );
    });

    it("should bind middleware use method correctly", async () => {
      const useSpy = spyOn(testMiddleware, "use").mockReturnValue("bound-result");
      spyOn((service as any).exceptionsFilter, "create").mockReturnValue({ next: mock() });
      // @ts-expect-error Mismatch types
      spyOn((service as any).venokProxy, "createProxy").mockImplementation((fn) => fn);

      const proxy = await (service as any).createProxy(testMiddleware);
      const result = proxy();

      expect(useSpy).toHaveBeenCalled();
      expect(result).toBe("bound-result");
    });
  });

  describe("integration scenarios", () => {
    it("should maintain proper execution order", async () => {
      const executionOrder: string[] = [];

      // Mock methods to track execution order
      spyOn(service as any, "loadConfiguration").mockImplementation(async (moduleRef: any, moduleKey: string) => {
        executionOrder.push(`loadConfig-${moduleKey}`);
      });

      spyOn((service as any).resolver, "resolveInstances").mockImplementation(async (moduleRef: any, moduleKey: string) => {
        executionOrder.push(`resolveInstances-${moduleKey}`);
      });

      const modulesMap = new Map([["TestModule", testModule]]);
      // @ts-expect-error Mismatch types
      container.getModules = mock(() => modulesMap);

      await service.explore(TestModule);

      expect(executionOrder).toEqual([
        "loadConfig-TestModule",
        "resolveInstances-TestModule",
      ]);
    });
  });

  describe("edge cases", () => {
    it("should handle modules with null instances", async () => {
      const nullModule = new CoreModule(TestModule, container);
      Object.defineProperty(nullModule, "instance", {
        value: null,
        writable: true,
        configurable: true,
      });

      // Should throw because null check is not handled properly in the code
      await expect((service as any).loadConfiguration(nullModule, "NullModule", TestModule)).rejects.toThrow();
    });

    it("should handle empty middleware arrays", async () => {
      const config = {
        middleware: [],
      };

      // Should not throw since empty arrays are handled gracefully  
      await (service as any).registerMiddleware("test-route", "TestModule", config);
    });

    it("should handle malformed configurations", async () => {
      const config = {
        middleware: null,
      };

      await expect(
        (service as any).registerMiddleware("test-route", "TestModule", config)
      ).rejects.toThrow();
    });

    it("should handle missing module references", async () => {
      container.getModuleByKey = mock(() => {
        throw new Error("Module not found");
      });

      const config: TestMiddlewareConfiguration = {
        middleware: [TestMiddleware],
        to: ["test-route"],
      };

      await expect(
        (service as any).registerConfig(config, "NonExistentModule")
      ).rejects.toThrow();
    });

    it("should handle context creation failures", async () => {
      const testWrapper = new InstanceWrapper({
        name: "TestMiddleware",
        metatype: TestMiddleware,
        token: TestMiddleware,
      });
      testWrapper.instance = new TestMiddleware();
      testWrapper.isDependencyTreeStatic = mock(() => false);

      container.getContextId = mock(() => {
        throw new Error("Context creation failed");
      });

      // Mock exception handler to suppress error logging
      const mockExceptionHandler = { next: mock() };
      spyOn((service as any).exceptionsFilter, "create").mockReturnValue(mockExceptionHandler);

      const callback = await service.testCreateCallback(testWrapper, testModule, new Map());

      // Exception will be thrown and caught by exception handler
      await callback("test-arg");
      
      expect(mockExceptionHandler.next).toHaveBeenCalled();
    });
  });

  describe("performance", () => {
    it("should handle large number of modules efficiently", async () => {
      // Create many modules
      const moduleCount = 50;
      const modulesMap = new Map();
      
      for (let i = 0; i < moduleCount; i++) {
        const moduleKey = `Module${i}`;
        const module = new CoreModule(TestModule, container);
        Object.defineProperty(module, "instance", {
          value: new TestModule(),
          writable: true,
          configurable: true,
        });
        modulesMap.set(moduleKey, module);
      }

      // @ts-expect-error Mismatch types
      container.getModules = mock(() => modulesMap);
      spyOn((service as any).resolver, "resolveInstances").mockResolvedValue(undefined);

      const startTime = Date.now();
      await service.explore(TestModule);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it("should efficiently cache exception handlers", async () => {
      const testWrapper = new InstanceWrapper({
        name: "TestMiddleware",
        metatype: TestMiddleware,
        token: TestMiddleware,
      });
      testWrapper.instance = new TestMiddleware();
      testWrapper.isDependencyTreeStatic = mock(() => false);

      spyOn((service as any).injector, "loadPerContext").mockRejectedValue(new Error("Error"));
      const createSpy = spyOn((service as any).exceptionsFilter, "create").mockReturnValue({ next: mock() });

      const callback = await service.testCreateCallback(testWrapper, testModule, new Map());

      // Call multiple times
      for (let i = 0; i < 10; i++) {
        await callback("test-arg");
      }

      // Exception handler should be created only once due to caching
      expect(createSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("abstract methods", () => {
    it("should require registerHandler implementation", () => {
      // This is tested indirectly through TestMiddlewareService
      // @ts-expect-error Mismatch types
      expect(service.registerHandler).toBeDefined();
      // @ts-expect-error Mismatch types
      expect(typeof service.registerHandler).toBe("function");
    });
  });
});