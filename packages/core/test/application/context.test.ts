import type { InjectionToken, Provider, PipeTransform, ExceptionFilter, VenokInterceptor, CanActivate } from "~/interfaces/index.js";

import { describe, expect, it, spyOn, mock, afterEach } from "bun:test";

import { ContextIdFactory } from "~/context/context-id.factory.js";
import { UnknownModuleException } from "~/errors/exceptions/unknown-module.exception.js";
import { ApplicationConfig } from "~/application/config.js";
import { Logger } from "~/services/logger.service.js";

import { Scope } from "~/enums/scope.enum.js";
import { Injector } from "~/injector/injector.js";
import { ApplicationContext } from "~/application/context.js";
import { InstanceLoader } from "~/injector/instance/loader.js";
import { GraphInspector } from "~/inspector/graph-inspector.js";
import { VenokContainer } from "~/injector/container.js";

describe("ApplicationContext", () => {
  class A {}

  // Store original methods to restore after tests
  const originalOverrideLogger = Logger.overrideLogger;
  const originalFlush = Logger.flush;

  afterEach(() => {
    // Restore original Logger methods to prevent interference with other tests
    Logger.overrideLogger = originalOverrideLogger;
    Logger.flush = originalFlush;
  });

  async function testHelper(
    injectionKey: InjectionToken,
    scope: Scope,
    additionalProviders: Array<Provider> = []
  ): Promise<ApplicationContext> {
    const container = new VenokContainer();
    const injector = new Injector();
    const instanceLoader = new InstanceLoader(
      container,
      injector,
      new GraphInspector(container)
    );
    const { moduleRef } = (await container.addModule(class T {}, []))!;

    container.addProvider(
      {
        provide: injectionKey,
        useClass: A,
        scope,
      },
      moduleRef.token
    );

    for (const provider of additionalProviders) {
      container.addProvider(provider, moduleRef.token);
    }

    container.addInjectable(
      {
        provide: injectionKey,
        useClass: A,
        scope,
      },
      moduleRef.token,
      "interceptor"
    );

    const modules = container.getModules();
    await instanceLoader.createInstancesOfDependencies(modules);

    // @ts-expect-error Mismatch types
    const applicationContext = new ApplicationContext(container, {});
    return applicationContext;
  }

  describe("listenToShutdownSignals", () => {
    it("shutdown process should not be interrupted by another handler", async () => {
      const signal = "SIGTERM";
      let processUp = true;
      let promisesResolved = false;
      const applicationContext = await testHelper(A, Scope.DEFAULT);
      
      const listeners: Array<(...args: any[]) => void> = [];
      
      spyOn(process, "listeners").mockImplementation(() => listeners);
      spyOn(process, "on").mockImplementation((event, handler) => {
        listeners.push(handler);
        return process;
      });
      spyOn(process, "removeListener").mockImplementation((event, handler) => {
        const index = listeners.indexOf(handler);
        if (index > -1) listeners.splice(index, 1);
        return process;
      });
      spyOn(process, "kill").mockImplementation((pid, signal) => {
        // Simulate signal emission to listeners
        listeners.forEach(listener => listener(signal));
        return true;
      });
      
      applicationContext.enableShutdownHooks([signal]);

      const waitProcessDown = new Promise(resolve => {
        const shutdownCleanupRef = applicationContext["shutdownCleanupRef"];
        const handler = () => {
          if (!listeners.find(handler => handler == shutdownCleanupRef)) {
            processUp = false;
            resolve(undefined);
          }
          return undefined;
        };
        listeners.push(handler);
      });

      const hookStub = spyOn(applicationContext as any, "callShutdownHook").mockImplementation(async () => {
        // run some async code
        await new Promise(resolve => setImmediate(() => resolve(undefined)));
        if (processUp) {
          promisesResolved = true;
        }
      });
      
      // Simulate process.kill
      listeners.forEach(listener => listener(signal));
      await waitProcessDown;
      
      hookStub.mockRestore();
      expect(processUp).toBe(false);
      expect(promisesResolved).toBe(true);
    });

    it("should defer shutdown until all init hooks are resolved", async () => {
      const signal = "SIGTERM";

      const onModuleInitStub = mock();
      const onApplicationShutdownStub = mock();

      class B {
        async onModuleInit() {
          onModuleInitStub();
        }

        async onApplicationShutdown() {
          onApplicationShutdownStub();
        }
      }

      const applicationContext = await testHelper(A, Scope.DEFAULT, [{ provide: B, useClass: B, scope: Scope.DEFAULT }]);
      applicationContext.enableShutdownHooks([signal]);

      // Mock the callDestructors and callShutdownHook methods 
      spyOn(applicationContext as any, "callShutdownHook").mockImplementation(async () => {
        // Simulate calling shutdown hooks
        onApplicationShutdownStub();
      });

      await applicationContext.init();
      
      // Verify init hook was called
      expect(onModuleInitStub).toHaveBeenCalled();
      expect(onApplicationShutdownStub).not.toHaveBeenCalled();

      // Call close to trigger shutdown hooks
      await applicationContext.close();
      
      expect(onModuleInitStub).toHaveBeenCalled();
      expect(onApplicationShutdownStub).toHaveBeenCalled();
    });
  });

  describe("get", () => {
    describe("when scope = DEFAULT", () => {
      it("should get value with function injection key", async () => {
        const key = A;
        const applicationContext = await testHelper(key, Scope.DEFAULT);

        const a1: A = await applicationContext.get(key);
        const a2: A = await applicationContext.get(key);

        expect(a1).toBeInstanceOf(A);
        expect(a2).toBeInstanceOf(A);
        expect(a1).toBe(a2);
      });

      it("should get value with string injection key", async () => {
        const key = "KEY_A";
        const applicationContext = await testHelper(key, Scope.DEFAULT);

        const a1: A = await applicationContext.get(key);
        const a2: A = await applicationContext.get(key);

        expect(a1).toBeInstanceOf(A);
        expect(a2).toBeInstanceOf(A);
        expect(a1).toBe(a2);
      });

      it("should get value with symbol injection key", async () => {
        const key = Symbol("KEY_A");
        const applicationContext = await testHelper(key, Scope.DEFAULT);

        const a1: A = await applicationContext.get(key);
        const a2: A = await applicationContext.get(key);

        expect(a1).toBeInstanceOf(A);
        expect(a2).toBeInstanceOf(A);
        expect(a1).toBe(a2);
      });
    });

    describe("when scope = REQUEST", () => {
      it("should throw error when use function injection key", async () => {
        const key = A;
        const applicationContext = await testHelper(key, Scope.REQUEST);

        expect(() => applicationContext.get(key)).toThrow();
      });

      it("should throw error when use string injection key", async () => {
        const key = "KEY_A";
        const applicationContext = await testHelper(key, Scope.REQUEST);

        expect(() => applicationContext.get(key)).toThrow();
      });

      it("should throw error when use symbol injection key", async () => {
        const key = Symbol("KEY_A");
        const applicationContext = await testHelper(key, Scope.REQUEST);

        expect(() => applicationContext.get(key)).toThrow();
      });
    });

    describe("when scope = TRANSIENT", () => {
      it("should throw error when use function injection key", async () => {
        const key = A;
        const applicationContext = await testHelper(key, Scope.TRANSIENT);

        expect(() => applicationContext.get(key)).toThrow();
      });

      it("should throw error when use string injection key", async () => {
        const key = "KEY_A";
        const applicationContext = await testHelper(key, Scope.TRANSIENT);

        expect(() => applicationContext.get(key)).toThrow();
      });

      it("should throw error when use symbol injection key", async () => {
        const key = Symbol("KEY_A");
        const applicationContext = await testHelper(key, Scope.TRANSIENT);

        expect(() => applicationContext.get(key)).toThrow();
      });
    });
  });

  describe("resolve", () => {
    describe("when scope = DEFAULT", () => {
      it("should resolve value with function injection key", async () => {
        const key = A;
        const applicationContext = await testHelper(key, Scope.DEFAULT);

        const a1: A = await applicationContext.resolve(key);
        const a2: A = await applicationContext.resolve(key);

        expect(a1).toBeInstanceOf(A);
        expect(a2).toBeInstanceOf(A);
        expect(a1).toBe(a2);
      });

      it("should resolve value with string injection key", async () => {
        const key = "KEY_A";
        const applicationContext = await testHelper(key, Scope.DEFAULT);

        const a1: A = await applicationContext.resolve(key);
        const a2: A = await applicationContext.resolve(key);

        expect(a1).toBeInstanceOf(A);
        expect(a2).toBeInstanceOf(A);
        expect(a1).toBe(a2);
      });

      it("should resolve value with symbol injection key", async () => {
        const key = Symbol("KEY_A");
        const applicationContext = await testHelper(key, Scope.DEFAULT);

        const a1: A = await applicationContext.resolve(key);
        const a2: A = await applicationContext.resolve(key);

        expect(a1).toBeInstanceOf(A);
        expect(a2).toBeInstanceOf(A);
        expect(a1).toBe(a2);
      });
    });

    describe("when scope = REQUEST", () => {
      it("should resolve value with function injection key", async () => {
        const key = A;
        const applicationContext = await testHelper(key, Scope.REQUEST);

        const contextId = ContextIdFactory.create();
        const a1: A = await applicationContext.resolve(key);
        const a2: A = await applicationContext.resolve(key, contextId);
        const a3: A = await applicationContext.resolve(key, contextId);

        expect(a1).toBeInstanceOf(A);
        expect(a2).toBeInstanceOf(A);
        expect(a1).not.toBe(a2);
        expect(a2).toBe(a3);
      });

      it("should resolve value with string injection key", async () => {
        const key = "KEY_A";
        const applicationContext = await testHelper(key, Scope.REQUEST);

        const contextId = ContextIdFactory.create();
        const a1: A = await applicationContext.resolve(key);
        const a2: A = await applicationContext.resolve(key, contextId);
        const a3: A = await applicationContext.resolve(key, contextId);

        expect(a1).toBeInstanceOf(A);
        expect(a2).toBeInstanceOf(A);
        expect(a1).not.toBe(a2);
        expect(a2).toBe(a3);
      });

      it("should resolve value with symbol injection key", async () => {
        const key = Symbol("KEY_A");
        const applicationContext = await testHelper(key, Scope.REQUEST);

        const contextId = ContextIdFactory.create();
        const a1: A = await applicationContext.resolve(key);
        const a2: A = await applicationContext.resolve(key, contextId);
        const a3: A = await applicationContext.resolve(key, contextId);

        expect(a1).toBeInstanceOf(A);
        expect(a2).toBeInstanceOf(A);
        expect(a1).not.toBe(a2);
        expect(a2).toBe(a3);
      });
    });

    describe("when scope = TRANSIENT", () => {
      it("should resolve value with function injection key", async () => {
        const key = A;
        const applicationContext = await testHelper(key, Scope.TRANSIENT);

        const contextId = ContextIdFactory.create();
        const a1: A = await applicationContext.resolve(key);
        const a2: A = await applicationContext.resolve(key, contextId);
        const a3: A = await applicationContext.resolve(key, contextId);

        expect(a1).toBeInstanceOf(A);
        expect(a2).toBeInstanceOf(A);
        expect(a1).not.toBe(a2);
        expect(a2).toBe(a3);
      });

      it("should resolve value with string injection key", async () => {
        const key = "KEY_A";
        const applicationContext = await testHelper(key, Scope.TRANSIENT);

        const contextId = ContextIdFactory.create();
        const a1: A = await applicationContext.resolve(key);
        const a2: A = await applicationContext.resolve(key, contextId);
        const a3: A = await applicationContext.resolve(key, contextId);

        expect(a1).toBeInstanceOf(A);
        expect(a2).toBeInstanceOf(A);
        expect(a1).not.toBe(a2);
        expect(a2).toBe(a3);
      });

      it("should resolve value with symbol injection key", async () => {
        const key = Symbol("KEY_A");
        const applicationContext = await testHelper(key, Scope.TRANSIENT);

        const contextId = ContextIdFactory.create();
        const a1: A = await applicationContext.resolve(key);
        const a2: A = await applicationContext.resolve(key, contextId);
        const a3: A = await applicationContext.resolve(key, contextId);

        expect(a1).toBeInstanceOf(A);
        expect(a2).toBeInstanceOf(A);
        expect(a1).not.toBe(a2);
        expect(a2).toBe(a3);
      });
    });
  });

  describe("preview mode", () => {
    it("should print warning when in preview mode", async () => {
      const loggerWarnSpy = spyOn(Logger.prototype, "warn").mockImplementation(() => {});
      
      const container = new VenokContainer();
      const config = new ApplicationConfig();
      const appOptions = { preview: true };
      
      new ApplicationContext(container, config, appOptions);
      
      expect(loggerWarnSpy).toHaveBeenCalledWith("------------------------------------------------");
      expect(loggerWarnSpy).toHaveBeenCalledWith("Application is running in the PREVIEW mode!");
      expect(loggerWarnSpy).toHaveBeenCalledWith("Providers will not be instantiated.");
      expect(loggerWarnSpy).toHaveBeenCalledTimes(4);
      
      loggerWarnSpy.mockRestore();
    });

    it("should throw error when calling methods in preview mode", async () => {
      const container = new VenokContainer();
      const config = new ApplicationConfig();
      const appOptions = { preview: true };
      
      const applicationContext = new ApplicationContext(container, config, appOptions);
      
      expect(() => {
        (applicationContext as any).assertNotInPreviewMode("testMethod");
      }).toThrow('Calling the "testMethod" in the preview mode is not supported.');
    });
  });

  describe("selectContextModule", () => {
    it("should select first module as context module", async () => {
      const applicationContext = await testHelper(A, Scope.DEFAULT);
      
      applicationContext.selectContextModule();
      
      const contextModule = (applicationContext as any).contextModule;
      expect(contextModule).toBeDefined();
    });
  });

  describe("select", () => {
    it("should create new context for selected module", async () => {
      const applicationContext = await testHelper(A, Scope.DEFAULT);
      applicationContext.selectContextModule();
      
      class TestModule {}
      const container = applicationContext.container;
      (await container.addModule(TestModule, []))!;
      
      const selectedContext = applicationContext.select(TestModule);
      
      expect(selectedContext).toBeInstanceOf(ApplicationContext);
      expect(selectedContext).not.toBe(applicationContext);
    });

    it("should throw UnknownModuleException for non-existent module", async () => {
      const applicationContext = await testHelper(A, Scope.DEFAULT);
      applicationContext.selectContextModule();
      
      class NonExistentModule {}
      
      expect(() => {
        applicationContext.select(NonExistentModule);
      }).toThrow(UnknownModuleException);
    });

    it("should merge select options with app options", async () => {
      const applicationContext = await testHelper(A, Scope.DEFAULT);
      applicationContext.selectContextModule();
      
      class TestModule {}
      const container = applicationContext.container;
      (await container.addModule(TestModule, []))!;
      
      const selectedContext = applicationContext.select(TestModule, { abortOnError: false });
      
      expect(selectedContext).toBeInstanceOf(ApplicationContext);
    });
  });

  describe("registerRequestByContextId", () => {
    it("should register request provider", async () => {
      const applicationContext = await testHelper(A, Scope.DEFAULT);
      const contextId = ContextIdFactory.create();
      const request = { test: "data" };
      
      const registerSpy = spyOn(applicationContext.container, "registerRequestProvider").mockImplementation(() => {});
      
      applicationContext.registerRequestByContextId(request, contextId);
      
      expect(registerSpy).toHaveBeenCalledWith(request, contextId);
    });
  });

  describe("logger methods", () => {
    it("should override logger and flush if needed", async () => {
      const applicationContext = await testHelper(A, Scope.DEFAULT);
      
      const overrideLoggerSpy = spyOn(Logger, "overrideLogger").mockImplementation(() => {});
      const flushSpy = spyOn(Logger, "flush").mockImplementation(() => {});
      
      applicationContext.flushLogsOnOverride();
      applicationContext.useLogger(false);
      
      expect(overrideLoggerSpy).toHaveBeenCalledWith(false);
      expect(flushSpy).toHaveBeenCalled();
    });

    it("should flush logs", async () => {
      const applicationContext = await testHelper(A, Scope.DEFAULT);
      
      const flushSpy = spyOn(Logger, "flush").mockImplementation(() => {});
      
      applicationContext.flushLogs();
      
      expect(flushSpy).toHaveBeenCalled();
    });
  });

  describe("global configuration methods", () => {
    it("should configure global filters", async () => {
      const applicationContext = await testHelper(A, Scope.DEFAULT);
      const config = new ApplicationConfig();
      (applicationContext as any).config = config;
      
      const filter: ExceptionFilter = { catch: () => {} };
      const useGlobalFiltersSpy = spyOn(config, "useGlobalFilters").mockImplementation(() => {});
      
      const result = applicationContext.useGlobalFilters(filter);
      
      expect(useGlobalFiltersSpy).toHaveBeenCalledWith(filter);
      expect(result).toBe(applicationContext);
    });

    it("should configure global pipes", async () => {
      const applicationContext = await testHelper(A, Scope.DEFAULT);
      const config = new ApplicationConfig();
      (applicationContext as any).config = config;
      
      const pipe: PipeTransform = { transform: (value) => value };
      const useGlobalPipesSpy = spyOn(config, "useGlobalPipes").mockImplementation(() => {});
      
      const result = applicationContext.useGlobalPipes(pipe);
      
      expect(useGlobalPipesSpy).toHaveBeenCalledWith(pipe);
      expect(result).toBe(applicationContext);
    });

    it("should configure global interceptors", async () => {
      const applicationContext = await testHelper(A, Scope.DEFAULT);
      const config = new ApplicationConfig();
      (applicationContext as any).config = config;

      // @ts-expect-error Mismatch types
      const interceptor: VenokInterceptor = { intercept: async () => {} };
      const useGlobalInterceptorsSpy = spyOn(config, "useGlobalInterceptors").mockImplementation(() => {});
      
      const result = applicationContext.useGlobalInterceptors(interceptor);
      
      expect(useGlobalInterceptorsSpy).toHaveBeenCalledWith(interceptor);
      expect(result).toBe(applicationContext);
    });

    it("should configure global guards", async () => {
      const applicationContext = await testHelper(A, Scope.DEFAULT);
      const config = new ApplicationConfig();
      (applicationContext as any).config = config;
      
      const guard: CanActivate = { canActivate: () => true };
      const useGlobalGuardsSpy = spyOn(config, "useGlobalGuards").mockImplementation(() => {});
      
      const result = applicationContext.useGlobalGuards(guard);
      
      expect(useGlobalGuardsSpy).toHaveBeenCalledWith(guard);
      expect(result).toBe(applicationContext);
    });
  });

  describe("lifecycle hooks", () => {
    it("should call shutdown hook", async () => {
      const applicationContext = await testHelper(A, Scope.DEFAULT);
      
      const getModulesToTriggerHooksOnSpy = spyOn(applicationContext as any, "getModulesToTriggerHooksOn").mockReturnValue([]);
      
      await (applicationContext as any).callShutdownHook("SIGTERM");
      
      expect(getModulesToTriggerHooksOnSpy).toHaveBeenCalled();
    });
  });
});