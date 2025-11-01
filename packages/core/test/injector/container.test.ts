/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { beforeEach, describe, expect, it, spyOn, mock } from "bun:test";
import { VenokContainer } from "~/injector/container.js";
import { Global } from "~/decorators/global.decorator.js";
import { UnknownModuleException } from "~/errors/exceptions/unknown-module.exception.js";
import { CircularDependencyException } from "~/errors/exceptions/circular-dependency.exception.js";
import { Module } from "~/decorators/module.decorator.js";
import { ApplicationConfig } from "~/application/config.js";
import { REQUEST_CONTEXT_ID, REQUEST } from "~/constants.js";

describe("VenokContainer", () => {
  let container: VenokContainer;
  let untypedContainer: any;

  @Module({})
  class TestModule {}

  @Global()
  @Module({})
  class GlobalTestModule {}

  beforeEach(() => {
    container = new VenokContainer();
    untypedContainer = container as any;
  });

  it('should "addProvider" throw "UnknownModuleException" when module is not stored in collection', () => {
    expect(() => container.addProvider({} as any, "TestModule")).toThrow(
      UnknownModuleException
    );
  });

  it('should "addProvider" throw "CircularDependencyException" when provider is nil', () => {
    expect(() => container.addProvider(null!, "TestModule")).toThrow(
      CircularDependencyException
    );
  });

  it('should "addExportedProviderOrModule" throw "UnknownModuleException" when module is not stored in collection', () => {
    expect(() =>
      container.addExportedProviderOrModule(null!, "TestModule")
    ).toThrow(UnknownModuleException);
  });

  it('should "addInjectable" throw "UnknownModuleException" when module is not stored in collection', () => {
    expect(() => container.addInjectable(null!, "TestModule", null!)).toThrow(
      UnknownModuleException
    );
  });

  describe("clear", () => {
    it("should call `clear` on modules collection", () => {
      const clearSpy = spyOn(untypedContainer.modules, "clear");
      container.clear();
      expect(clearSpy).toHaveBeenCalled();
    });
  });

  describe("addModule", () => {
    it("should not add module if already exists in collection", async () => {
      const modules = new Map();
      const setSpy = spyOn(modules, "set");
      untypedContainer.modules = modules;

      await container.addModule(TestModule as any, []);
      await container.addModule(TestModule as any, []);

      expect(setSpy).toHaveBeenCalledTimes(1);
    });

    it("should throw an exception when metatype is not defined", () => {
      expect(container.addModule(undefined, [])).rejects.toThrow();
    });

    it("should add global module when module is global", async () => {
      const addGlobalModuleSpy = spyOn(container, "addGlobalModule");
      await container.addModule(GlobalTestModule as any, []);
      expect(addGlobalModuleSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("replaceModule", () => {
    it("should replace module if already exists in collection", async () => {
      @Module({})
      class ReplaceTestModule {}

      const modules = new Map();
      const setSpy = spyOn(modules, "set");
      untypedContainer.modules = modules;

      await container.addModule(TestModule as any, []);
      await container.replaceModule(
        TestModule as any,
        ReplaceTestModule as any,
        []
      );

      expect(setSpy).toHaveBeenCalledTimes(2);
    });

    it("should throw an exception when metatype is not defined", () => {
      expect(container.addModule(undefined, [])).rejects.toThrow();
    });

    it("should add global module when module is global", async () => {
      const addGlobalModuleSpy = spyOn(container, "addGlobalModule");
      await container.addModule(GlobalTestModule as any, []);
      expect(addGlobalModuleSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("isGlobalModule", () => {
    describe("when module is not globally scoped", () => {
      it("should return false", () => {
        expect(container.isGlobalModule(TestModule)).toBe(false);
      });
    });
    describe("when module is globally scoped", () => {
      it("should return true", () => {
        expect(container.isGlobalModule(GlobalTestModule)).toBe(true);
      });
    });
    describe("when dynamic module is globally scoped", () => {
      it("should return true", () => {
        expect(container.isGlobalModule(TestModule, { global: true })).toBe(true);
      });
    });
  });

  describe("bindGlobalsToImports", () => {
    it('should call "bindGlobalModuleToModule" for every global module', () => {
      const global1 = { test: 1 };
      const global2 = { test: 2 };

      container.addGlobalModule(global1 as any);
      container.addGlobalModule(global2 as any);

      const bindGlobalModuleToModuleSpy = spyOn(
        container,
        "bindGlobalModuleToModule"
      );
      container.bindGlobalsToImports({
        addImport: mock(),
      } as any);
      expect(bindGlobalModuleToModuleSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("bindGlobalModuleToModule", () => {
    describe('when "module" is not "globalModule"', () => {
      it('should call "addImport"', () => {
        const module = { addImport: mock() };
        container.bindGlobalModuleToModule(module as any, null!);
        expect(module.addImport).toHaveBeenCalledTimes(1);
      });
    });
    describe('when "module" is "globalModule"', () => {
      it('should not call "addImport"', () => {
        const module = { addImport: mock() };
        container.bindGlobalModuleToModule(module as any, module as any);
        expect(module.addImport).not.toHaveBeenCalled();
      });
    });
  });

  describe("addDynamicMetadata", () => {
    let token: string;
    let collection: Map<string, any>;

    beforeEach(() => {
      token = "token";
      collection = new Map();
      untypedContainer.dynamicModulesMetadata = collection;
    });
    describe("when dynamic metadata exists", () => {
      it("should add to the dynamic metadata collection", async () => {
        const addSpy = spyOn(collection, "set");
        const dynamicMetadata = { module: null! };

        await container.addDynamicMetadata(token, dynamicMetadata, []);
        expect(addSpy).toHaveBeenCalledWith(token, dynamicMetadata);
      });
    });
    describe("when dynamic metadata does not exists", () => {
      it("should not add to the dynamic metadata collection", async () => {
        const addSpy = spyOn(collection, "set");
        await container.addDynamicMetadata(token, null!, []);
        expect(addSpy).not.toHaveBeenCalled();
      });
    });
  });

  class Test {}
  describe("addDynamicModules", () => {
    describe("when array is empty/undefined", () => {
      it('should not call "addModule"', async () => {
        const addModuleSpy = spyOn(container, "addModule");
        await container.addDynamicModules(undefined, []);
        expect(addModuleSpy).not.toHaveBeenCalled();
      });
    });
    describe("when array is not empty/undefined", () => {
      it('should call "addModule"', async () => {
        const addModuleSpy = spyOn(container, "addModule");
        await container.addDynamicModules([Test] as any, []);
        expect(addModuleSpy).toHaveBeenCalled();
      });
    });
  });

  describe("get applicationConfig", () => {
    it("should return ApplicationConfig instance", () => {
      expect(container.applicationConfig).toEqual(
        untypedContainer._applicationConfig
      );
    });
  });

  describe("getModuleByKey", () => {
    it("should return module by passed key", () => {
      const key = "test";
      const value = {};
      container.getModules().set(key, value as any);

      // @ts-expect-error Mismatch types
      expect(container.getModuleByKey(key)).toEqual(value);
    });
  });

  describe("registerCoreModuleRef", () => {
    it("should register core module ref", () => {
      const ref = {} as any;
      container.registerCoreModuleRef(ref);
      expect(untypedContainer.internalCoreModule).toEqual(ref);
    });
  });

  describe("constructor", () => {
    it("should create container with custom ApplicationConfig", () => {
      const customConfig = new ApplicationConfig();
      const customContainer = new VenokContainer(customConfig);
      expect(customContainer.applicationConfig).toEqual(customConfig);
    });
  });

  describe("getModuleCompiler", () => {
    it("should return module compiler", () => {
      const compiler = container.getModuleCompiler();
      expect(compiler).toBeDefined();
      expect(typeof compiler.compile).toBe("function");
    });
  });

  describe("getInternalCoreModuleRef", () => {
    it("should return undefined when no core module is registered", () => {
      expect(container.getInternalCoreModuleRef()).toBeUndefined();
    });

    it("should return core module when registered", () => {
      const coreModule = {} as any;
      container.registerCoreModuleRef(coreModule);
      expect(container.getInternalCoreModuleRef()).toEqual(coreModule);
    });
  });

  describe("addImport", () => {
    it("should not add import when module does not exist", async () => {
      await container.addImport(TestModule, "nonexistent-token");
      // Should not throw and should handle gracefully
    });

    it("should add import when module exists", async () => {
      const { moduleRef } = (await container.addModule(TestModule, []))!;
      const { moduleRef: relatedModule } = (await container.addModule(GlobalTestModule, []))!;
      
      const addImportSpy = spyOn(moduleRef, "addImport");
      await container.addImport(GlobalTestModule, moduleRef.token);
      
      expect(addImportSpy).toHaveBeenCalledWith(relatedModule);
    });
  });

  describe("replace", () => {
    it("should call replace on all modules", async () => {
      const { moduleRef } = (await container.addModule(TestModule, []))!;
      const replaceSpy = spyOn(moduleRef, "replace");
      
      const toReplace = {};
      const options = { scope: [] };
      
      container.replace(toReplace, options);
      expect(replaceSpy).toHaveBeenCalledWith(toReplace, options);
    });
  });

  describe("bindGlobalScope", () => {
    it("should bind globals to all modules", async () => {
      const { moduleRef } = (await container.addModule(TestModule, []))!;
      await container.addModule(GlobalTestModule, []);
      
      const bindGlobalsToImportsSpy = spyOn(container, "bindGlobalsToImports");
      container.bindGlobalScope();
      
      expect(bindGlobalsToImportsSpy).toHaveBeenCalledWith(moduleRef);
    });
  });

  describe("getDynamicMetadataByToken", () => {
    beforeEach(async () => {
      const dynamicModule = {
        module: TestModule,
        imports: [GlobalTestModule],
        providers: ["test-provider"],
      };
      // @ts-expect-error Mismatch types
      await container.addDynamicMetadata("test-token", dynamicModule, []);
    });

    it("should return full metadata when no key specified", () => {
      const metadata = container.getDynamicMetadataByToken("test-token");
      expect(metadata).toBeDefined();
      expect(metadata.imports).toEqual([GlobalTestModule]);
    });

    it("should return specific metadata key", () => {
      const imports = container.getDynamicMetadataByToken("test-token", "imports");
      expect(imports).toEqual([GlobalTestModule]);
    });

    it("should return empty array for non-existent key", () => {
      const result = container.getDynamicMetadataByToken("non-existent", "imports");
      expect(result).toEqual([]);
    });
  });

  describe("getModuleTokenFactory", () => {
    it("should return token factory", () => {
      const factory = container.getModuleTokenFactory();
      expect(factory).toBeDefined();
      expect(typeof factory.create).toBe("function");
    });
  });

  describe("getContextId", () => {
    beforeEach(() => {
      // Setup core module with mocked REQUEST provider
      const mockWrapper = {
        setInstanceByContextId: mock(),
      };
      const coreModule = {
        getProviderByKey: mock().mockReturnValue(mockWrapper),
      };
      container.registerCoreModuleRef(coreModule as any);
    });

    it("should create and return context id for request", () => {
      const request = { test: "value" };
      const contextId = container.getContextId(request, false);
      
      expect(contextId).toBeDefined();
      expect(contextId.id).toBeDefined();
      // @ts-expect-error Mismatch types
      expect(request[REQUEST_CONTEXT_ID]).toEqual(contextId);
    });

    it("should return existing context id for same request", () => {
      const request = { test: "value" };
      const contextId1 = container.getContextId(request, false);
      const contextId2 = container.getContextId(request, false);
      
      expect(contextId1).toEqual(contextId2);
    });

    it("should handle tree durable requests", () => {
      const request = { test: "value" };
      const contextId = container.getContextId(request, true);
      
      expect(contextId).toBeDefined();
      // @ts-expect-error Mismatch types
      expect(request[REQUEST_CONTEXT_ID as any]).toEqual(contextId);
    });
  });

  describe("registerRequestProvider", () => {
    it("should register request provider with context id", async () => {
      // Setup core module first
      const mockWrapper = {
        setInstanceByContextId: mock(),
      };
      const coreModule = {
        getProviderByKey: mock().mockReturnValue(mockWrapper),
      };
      container.registerCoreModuleRef(coreModule as any);
      
      const request = { test: "value" };
      const contextId = { id: 1, payload: {} };
      
      container.registerRequestProvider(request, contextId as any);
      
      expect(coreModule.getProviderByKey).toHaveBeenCalledWith(REQUEST);
      expect(mockWrapper.setInstanceByContextId).toHaveBeenCalledWith(contextId, {
        instance: request,
        isResolved: true,
      });
    });
  });
});