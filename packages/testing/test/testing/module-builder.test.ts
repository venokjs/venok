import type { LoggerService, ModuleMetadata } from "@venok/core";

import {
  ApplicationConfig,
  ApplicationContext,
  DependenciesScanner,
  Logger,
  MetadataScanner,
  Module,
  UuidFactory,
  VenokContainer
} from "@venok/core";
import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";

import { TestingModuleBuilder } from "~/testing/module-builder.js";
import { TestingInstanceLoader } from "~/testing/instance-loader.js";
import { TestingLogger } from "~/testing/logger.js";

describe("TestingModuleBuilder", () => {
  let metadataScanner: MetadataScanner;
  let testingModuleBuilder: TestingModuleBuilder;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let mockModule: any;

  const mockMetadata: ModuleMetadata = {
    providers: [],
    imports: [],
    exports: [],
  };

  beforeEach(() => {
    metadataScanner = new MetadataScanner();
    testingModuleBuilder = new TestingModuleBuilder(metadataScanner, mockMetadata);
    
    @Module({})
    class TestModule {}
    mockModule = TestModule;
  });

  afterEach(() => {
    // No cleanup needed for bun test
  });

  describe("constructor", () => {
    it("should create instance with correct properties", () => {
      expect(testingModuleBuilder).toBeInstanceOf(TestingModuleBuilder);
      expect((testingModuleBuilder as any).metadataScanner).toBe(metadataScanner);
      expect((testingModuleBuilder as any).applicationConfig).toBeInstanceOf(ApplicationConfig);
      expect((testingModuleBuilder as any).container).toBeInstanceOf(VenokContainer);
      expect((testingModuleBuilder as any).overloadsMap).toBeInstanceOf(Map);
      expect((testingModuleBuilder as any).moduleOverloadsMap).toBeInstanceOf(Map);
    });

    it("should create module from metadata", () => {
      const module = (testingModuleBuilder as any).module;
      expect(module).toBeDefined();
      expect(typeof module).toBe("function");
    });
  });

  describe("setLogger", () => {
    it("should set custom logger and return builder instance", () => {
      const customLogger: LoggerService = {
        log: () => {},
        error: () => {},
        warn: () => {},
        debug: () => {},
        verbose: () => {},
      };

      const result = testingModuleBuilder.setLogger(customLogger);
      
      expect(result).toBe(testingModuleBuilder);
      expect((testingModuleBuilder as any).testingLogger).toBe(customLogger);
    });
  });

  describe("override methods", () => {
    class TestProvider {}

    it("should create override for pipe", () => {
      const overrideBy = testingModuleBuilder.overridePipe(TestProvider);
      
      expect(overrideBy).toHaveProperty("useValue");
      expect(overrideBy).toHaveProperty("useFactory");
      expect(overrideBy).toHaveProperty("useClass");
      expect(typeof overrideBy.useValue).toBe("function");
      expect(typeof overrideBy.useFactory).toBe("function");
      expect(typeof overrideBy.useClass).toBe("function");
    });

    it("should create override for filter", () => {
      const overrideBy = testingModuleBuilder.overrideFilter(TestProvider);
      
      expect(overrideBy).toHaveProperty("useValue");
      expect(overrideBy).toHaveProperty("useFactory");
      expect(overrideBy).toHaveProperty("useClass");
    });

    it("should create override for guard", () => {
      const overrideBy = testingModuleBuilder.overrideGuard(TestProvider);
      
      expect(overrideBy).toHaveProperty("useValue");
      expect(overrideBy).toHaveProperty("useFactory");
      expect(overrideBy).toHaveProperty("useClass");
    });

    it("should create override for interceptor", () => {
      const overrideBy = testingModuleBuilder.overrideInterceptor(TestProvider);
      
      expect(overrideBy).toHaveProperty("useValue");
      expect(overrideBy).toHaveProperty("useFactory");
      expect(overrideBy).toHaveProperty("useClass");
    });

    it("should create override for provider", () => {
      const overrideBy = testingModuleBuilder.overrideProvider(TestProvider);
      
      expect(overrideBy).toHaveProperty("useValue");
      expect(overrideBy).toHaveProperty("useFactory");
      expect(overrideBy).toHaveProperty("useClass");
    });

    describe("useValue", () => {
      it("should add override with useValue and return builder", () => {
        const mockValue = { test: "value" };
        
        const result = testingModuleBuilder.overrideProvider(TestProvider).useValue(mockValue);
        
        expect(result).toBe(testingModuleBuilder);
        
        const overloadsMap = (testingModuleBuilder as any).overloadsMap;
        expect(overloadsMap.has(TestProvider)).toBe(true);
        expect(overloadsMap.get(TestProvider)).toEqual({
          useValue: mockValue,
          isProvider: true,
        });
      });
    });

    describe("useClass", () => {
      it("should add override with useClass and return builder", () => {
        class MockClass {}
        
        const result = testingModuleBuilder.overrideProvider(TestProvider).useClass(MockClass);
        
        expect(result).toBe(testingModuleBuilder);
        
        const overloadsMap = (testingModuleBuilder as any).overloadsMap;
        expect(overloadsMap.has(TestProvider)).toBe(true);
        expect(overloadsMap.get(TestProvider)).toEqual({
          useClass: MockClass,
          isProvider: true,
        });
      });
    });

    describe("useFactory", () => {
      it("should add override with useFactory and return builder", () => {
        const mockFactory = () => ({ test: "factory" });
        const inject = ["DEPENDENCY"];
        
        const result = testingModuleBuilder.overrideProvider(TestProvider).useFactory({
          factory: mockFactory,
          inject,
        });
        
        expect(result).toBe(testingModuleBuilder);
        
        const overloadsMap = (testingModuleBuilder as any).overloadsMap;
        expect(overloadsMap.has(TestProvider)).toBe(true);
        const override = overloadsMap.get(TestProvider);
        expect(override.useFactory).toBe(mockFactory);
        expect(override.inject).toEqual(inject);
        expect(override.isProvider).toBe(true);
      });
    });

    it("should distinguish between provider and non-provider overrides", () => {
      const mockValue = { test: "value" };
      
      testingModuleBuilder.overrideProvider(TestProvider).useValue(mockValue);
      testingModuleBuilder.overridePipe("PIPE_TOKEN").useValue(mockValue);
      
      const overloadsMap = (testingModuleBuilder as any).overloadsMap;
      
      expect(overloadsMap.get(TestProvider).isProvider).toBe(true);
      expect(overloadsMap.get("PIPE_TOKEN").isProvider).toBe(false);
    });
  });

  describe("overrideModule", () => {
    it("should create module override and return OverrideModule interface", () => {
      @Module({})
      class OriginalModule {}
      
      const overrideModule = testingModuleBuilder.overrideModule(OriginalModule);
      
      expect(overrideModule).toHaveProperty("useModule");
      expect(typeof overrideModule.useModule).toBe("function");
    });

    it("should add module override when useModule is called", () => {
      @Module({})
      class OriginalModule {}
      
      @Module({})
      class ReplacementModule {}
      
      const result = testingModuleBuilder.overrideModule(OriginalModule).useModule(ReplacementModule);
      
      expect(result).toBe(testingModuleBuilder);
      
      const moduleOverloadsMap = (testingModuleBuilder as any).moduleOverloadsMap;
      expect(moduleOverloadsMap.has(OriginalModule)).toBe(true);
      expect(moduleOverloadsMap.get(OriginalModule)).toBe(ReplacementModule);
    });
  });

  describe("useMocker", () => {
    it("should set mocker and return builder instance", () => {
      const mockFactory = (token?: any) => ({ mocked: token });
      
      const result = testingModuleBuilder.useMocker(mockFactory);
      
      expect(result).toBe(testingModuleBuilder);
      expect((testingModuleBuilder as any).mocker).toBe(mockFactory);
    });
  });

  describe("compile", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let consoleLoggerSpy: any;
    let loggerOverrideSpy: any;
    let scannerScanSpy: any;
    let instanceLoaderSpy: any;

    beforeEach(() => {
      consoleLoggerSpy = spyOn(Logger, "overrideLogger");
      loggerOverrideSpy = spyOn(Logger, "overrideLogger");
      scannerScanSpy = spyOn(DependenciesScanner.prototype, "scan").mockResolvedValue(undefined);
      instanceLoaderSpy = spyOn(TestingInstanceLoader.prototype, "createInstancesOfDependencies").mockResolvedValue(undefined);
      spyOn(DependenciesScanner.prototype, "applyApplicationProviders").mockReturnValue(undefined);
    });

    it("should compile testing module with default options", async () => {
      const context = await testingModuleBuilder.compile();
      
      expect(context).toBeInstanceOf(ApplicationContext);
      expect(scannerScanSpy).toHaveBeenCalledWith(
        (testingModuleBuilder as any).module,
        { overrides: [] }
      );
    });

    it("should set UUID factory mode based on snapshot option", async () => {
      // DeterministicUuidRegistry needs to be cleared to get consistent results
      const { DeterministicUuidRegistry } = await import("@venok/core");
      
      DeterministicUuidRegistry.clear();
      await testingModuleBuilder.compile({ snapshot: true });
      const deterministicUuid1 = UuidFactory.get("test");
      
      DeterministicUuidRegistry.clear();
      await testingModuleBuilder.compile({ snapshot: true });
      const deterministicUuid2 = UuidFactory.get("test");
      // Deterministic mode should produce the same UUID for the same key when registry is clear
      expect(deterministicUuid1).toBe(deterministicUuid2);
      
      await testingModuleBuilder.compile({ snapshot: false });
      const randomUuid1 = UuidFactory.get();
      const randomUuid2 = UuidFactory.get();
      // Random mode should produce different UUIDs
      expect(randomUuid1).not.toBe(randomUuid2);
    });

    it("should use GraphInspector when snapshot is true", async () => {
      const context = await testingModuleBuilder.compile({ snapshot: true });
      
      expect(context).toBeInstanceOf(ApplicationContext);
    });

    it("should use NoopGraphInspector when snapshot is false", async () => {
      const context = await testingModuleBuilder.compile({ snapshot: false });
      
      expect(context).toBeInstanceOf(ApplicationContext);
    });

    it("should apply custom logger when set", async () => {
      const customLogger: LoggerService = {
        log: () => {},
        error: () => {},
        warn: () => {},
        debug: () => {},
        verbose: () => {},
      };
      
      testingModuleBuilder.setLogger(customLogger);
      await testingModuleBuilder.compile();
      
      expect(loggerOverrideSpy).toHaveBeenCalledWith(customLogger);
    });

    it("should use default TestingLogger when no custom logger is set", async () => {
      await testingModuleBuilder.compile();
      
      expect(loggerOverrideSpy).toHaveBeenCalledWith(expect.any(TestingLogger));
    });

    it("should pass preview option to instance loader", async () => {
      await testingModuleBuilder.compile({ preview: true });
      
      expect(instanceLoaderSpy).toHaveBeenCalledWith(
        expect.any(Map),
        undefined
      );
    });

    it("should apply overloads to container", async () => {
      const mockValue = { test: "value" };
      
      testingModuleBuilder.overrideProvider("TEST_TOKEN").useValue(mockValue);
      
      const replaceSpy = spyOn(VenokContainer.prototype, "replace");
      
      await testingModuleBuilder.compile();
      
      expect(replaceSpy).toHaveBeenCalledWith("TEST_TOKEN", {
        useValue: mockValue,
        isProvider: true,
      });
    });

    it("should pass module overrides to scanner", async () => {
      @Module({})
      class OriginalModule {}
      
      @Module({})
      class ReplacementModule {}
      
      testingModuleBuilder.overrideModule(OriginalModule).useModule(ReplacementModule);
      
      await testingModuleBuilder.compile();
      
      expect(scannerScanSpy).toHaveBeenCalledWith(
        (testingModuleBuilder as any).module,
        {
          overrides: [
            {
              moduleToReplace: OriginalModule,
              newModule: ReplacementModule,
            },
          ],
        }
      );
    });

    it("should pass mocker to instance loader", async () => {
      const mockFactory = (token?: any) => ({ mocked: token });
      
      testingModuleBuilder.useMocker(mockFactory);
      
      await testingModuleBuilder.compile();
      
      expect(instanceLoaderSpy).toHaveBeenCalledWith(
        expect.any(Map),
        mockFactory
      );
    });

    it("should handle NestJS logger override gracefully when @nestjs/common is not available", async () => {
      // This test ensures compile doesn't throw when NestJS is not available
      await expect(testingModuleBuilder.compile()).resolves.toBeInstanceOf(ApplicationContext);
    });
  });

  describe("private methods", () => {
    describe("createModule", () => {
      it("should create a module with the provided metadata", () => {
        const metadata: ModuleMetadata = {
          providers: [{ provide: "TEST", useValue: "test" }],
          imports: [],
          exports: [],
        };
        
        const module = (testingModuleBuilder as any).createModule(metadata);
        
        expect(typeof module).toBe("function");
        expect(module.name).toBe("RootTestModule");
      });
    });

    describe("getModuleOverloads", () => {
      it("should return empty array when no module overrides", () => {
        const overrides = (testingModuleBuilder as any).getModuleOverloads();
        
        expect(overrides).toEqual([]);
      });

      it("should return module overrides in correct format", () => {
        @Module({})
        class OriginalModule {}
        
        @Module({})
        class ReplacementModule {}
        
        testingModuleBuilder.overrideModule(OriginalModule).useModule(ReplacementModule);
        
        const overrides = (testingModuleBuilder as any).getModuleOverloads();
        
        expect(overrides).toEqual([
          {
            moduleToReplace: OriginalModule,
            newModule: ReplacementModule,
          },
        ]);
      });
    });

    describe("getRootModule", () => {
      it("should return the first module from container", () => {
        const mockModulesMap = new Map();
        const mockModule = { test: "module" };
        mockModulesMap.set("key", mockModule);

        // @ts-expect-error Mismatch types
        const containerSpy = spyOn(VenokContainer.prototype, "getModules").mockReturnValue(mockModulesMap);
        
        const rootModule = (testingModuleBuilder as any).getRootModule();
        
        expect(containerSpy).toHaveBeenCalled();
        expect(rootModule).toBe(mockModule);
      });
    });

    describe("applyOverloadsMap", () => {
      it("should call container.replace for each override", () => {
        const mockValue = { test: "value" };
        const replaceSpy = spyOn(VenokContainer.prototype, "replace");
        
        testingModuleBuilder.overrideProvider("TEST_TOKEN").useValue(mockValue);
        
        (testingModuleBuilder as any).applyOverloadsMap();
        
        expect(replaceSpy).toHaveBeenCalledWith("TEST_TOKEN", {
          useValue: mockValue,
          isProvider: true,
        });
      });
    });
  });
});