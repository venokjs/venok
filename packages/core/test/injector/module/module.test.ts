import { beforeEach, describe, expect, it, spyOn, mock } from "bun:test";
import { VenokContainer } from "~/injector/container.js";
import { CoreModule, Injectable, InstanceWrapper, RuntimeException, UnknownElementException, UnknownExportException, Module } from "~/index.js";
import { ENTRY_PROVIDER_WATERMARK } from "~/constants.js";

describe("CoreModule", () => {
  let moduleRef: CoreModule;
  let untypedModuleRef: any;
  let container: VenokContainer;

  @Module({})
  class TestModule {}

  @Injectable()
  class TestProvider {}

  beforeEach(() => {
    container = new VenokContainer();
    moduleRef = new CoreModule(TestModule, container);
    untypedModuleRef = moduleRef as any;
  });

  it("should add injectable", () => {
    const collection = new Map();
    const setSpy = spyOn(collection, "set");
    untypedModuleRef._injectables = collection;

    moduleRef.addInjectable(TestProvider, "interceptor", TestModule);

    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(setSpy).toHaveBeenCalledWith(TestProvider, expect.any(InstanceWrapper));
    const [token, wrapper] = setSpy.mock.calls[0];
    expect(token).toBe(TestProvider);
    expect(wrapper).toBeInstanceOf(InstanceWrapper);
    expect(wrapper.name).toBe("TestProvider");
    expect(wrapper.subtype).toBe("interceptor");
    expect(collection.has(TestProvider)).toBe(true);
    expect(collection.get(TestProvider)).toBeInstanceOf(InstanceWrapper);
  });

  describe("when injectable is custom provided", () => {
    it("should call `addCustomProvider`", () => {
      const addCustomProviderSpy = spyOn(moduleRef, "addCustomProvider");

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      moduleRef.addInjectable({ provide: "test" } as any, "guard");
      expect(addCustomProviderSpy).toHaveBeenCalled();
    });
  });

  it("should add provider", () => {
    const collection = new Map();
    const setSpy = spyOn(collection, "set");
    untypedModuleRef._providers = collection;

    moduleRef.addProvider(TestProvider);

    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(setSpy).toHaveBeenCalledWith(TestProvider, expect.any(InstanceWrapper));
    const [token, wrapper] = setSpy.mock.calls[0];
    expect(token).toBe(TestProvider);
    expect(wrapper).toBeInstanceOf(InstanceWrapper);
    expect(wrapper.name).toBe("TestProvider");
    expect(collection.has(TestProvider)).toBe(true);
    expect(collection.get(TestProvider)).toBeInstanceOf(InstanceWrapper);
  });

  it('should call "addCustomProvider" when "provide" property exists', () => {
    const addCustomProvider = mock();
    moduleRef.addCustomProvider = addCustomProvider;

    const provider = { provide: "test", useValue: "test" };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    moduleRef.addProvider(provider as any);
    expect(addCustomProvider).toHaveBeenCalled();
  });

  it('should call "addCustomClass" when "useClass" property exists', () => {
    const addCustomClass = mock();
    moduleRef.addCustomClass = addCustomClass;

    const provider = { provide: "test", useClass: () => null };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    moduleRef.addCustomProvider(provider as any, new Map());
    expect(addCustomClass).toHaveBeenCalled();
  });

  it('should call "addCustomValue" when "useValue" property exists', () => {
    const addCustomValue = mock();
    moduleRef.addCustomValue = addCustomValue;

    const provider = { provide: "test", useValue: () => null };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    moduleRef.addCustomProvider(provider as any, new Map());
    expect(addCustomValue).toHaveBeenCalled();
  });

  it('should call "addCustomValue" when "useValue" property exists but its value is `undefined`', () => {
    const addCustomValue = mock();
    moduleRef.addCustomValue = addCustomValue;

    const provider = { provide: "test", useValue: undefined };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    moduleRef.addCustomProvider(provider as any, new Map());
    expect(addCustomValue).toHaveBeenCalled();
  });

  it('should call "addCustomFactory" when "useFactory" property exists', () => {
    const addCustomFactory = mock();
    moduleRef.addCustomFactory = addCustomFactory;

    const provider = { provide: "test", useFactory: () => null };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    moduleRef.addCustomProvider(provider as any, new Map());
    expect(addCustomFactory).toHaveBeenCalled();
  });

  it('should call "addCustomUseExisting" when "useExisting" property exists', () => {
    const addCustomUseExisting = mock();
    moduleRef.addCustomUseExisting = addCustomUseExisting;

    const provider = { provide: "test", useExisting: () => null };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    moduleRef.addCustomUseExisting(provider as any, new Map());
    expect(addCustomUseExisting).toHaveBeenCalled();
  });

  describe("addCustomClass", () => {
    const type = { name: "TypeTest" };
    const provider = { provide: type, useClass: type, durable: true };
    let setSpy: any;

    beforeEach(() => {
      const collection = new Map();
      setSpy = spyOn(collection, "set");
      untypedModuleRef._providers = collection;
    });
    it("should store provider", () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      moduleRef.addCustomClass(provider as any, untypedModuleRef._providers);

      expect(setSpy).toHaveBeenCalledTimes(1);
      expect(setSpy).toHaveBeenCalledWith(provider.provide, expect.any(InstanceWrapper));
      const [token, wrapper] = setSpy.mock.calls[0];
      expect(token).toBe(type);
      expect(wrapper).toBeInstanceOf(InstanceWrapper);
      expect(wrapper.name).toBe(provider.provide.name);
      expect(untypedModuleRef._providers.has(token)).toBe(true);
      expect(untypedModuleRef._providers.get(token)).toBeInstanceOf(InstanceWrapper);
    });
  });

  describe("addCustomValue", () => {
    let setSpy: any;
    const value = () => ({});
    const provider = { provide: value, useValue: value };

    beforeEach(() => {
      const collection = new Map();
      setSpy = spyOn(collection, "set");
      untypedModuleRef._providers = collection;
    });

    it("should store provider", () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      moduleRef.addCustomValue(provider as any, untypedModuleRef._providers);

      expect(setSpy).toHaveBeenCalledTimes(1);
      expect(setSpy).toHaveBeenCalledWith(provider.provide, expect.any(InstanceWrapper));
      const [token, wrapper] = setSpy.mock.calls[0];
      expect(token).toBe(provider.provide);
      expect(wrapper).toBeInstanceOf(InstanceWrapper);
      expect(wrapper.name).toBe(provider.provide.name);
      expect(untypedModuleRef._providers.has(token)).toBe(true);
      expect(untypedModuleRef._providers.get(token)).toBeInstanceOf(InstanceWrapper);
    });
  });

  describe("addCustomFactory", () => {
    const type = { name: "TypeTest" };
    const inject = [1, 2, 3];
    const provider = { provide: type, useFactory: type, inject, durable: true };

    let setSpy: any;
    beforeEach(() => {
      const collection = new Map();
      setSpy = spyOn(collection, "set");
      untypedModuleRef._providers = collection;
    });
    it("should store provider", () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      moduleRef.addCustomFactory(provider as any, untypedModuleRef._providers);

      expect(setSpy).toHaveBeenCalledTimes(1);
      expect(setSpy).toHaveBeenCalledWith(provider.provide, expect.any(InstanceWrapper));
      const [token, wrapper] = setSpy.mock.calls[0];
      expect(token).toBe(provider.provide);
      expect(wrapper).toBeInstanceOf(InstanceWrapper);
      expect(wrapper.name).toBe(provider.provide.name);
      expect(untypedModuleRef._providers.has(token)).toBe(true);
      expect(untypedModuleRef._providers.get(token)).toBeInstanceOf(InstanceWrapper);
    });
  });

  describe("addCustomUseExisting", () => {
    const type = { name: "TypeTest" };
    const provider = { provide: type, useExisting: type };

    let setSpy: any;
    beforeEach(() => {
      const collection = new Map();
      setSpy = spyOn(collection, "set");
      untypedModuleRef._providers = collection;
    });
    it("should store provider", () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      moduleRef.addCustomUseExisting(provider as any, untypedModuleRef._providers);
      const factoryFn = untypedModuleRef._providers.get(provider.provide).metatype;

      expect(setSpy).toHaveBeenCalledTimes(1);
      expect(setSpy).toHaveBeenCalledWith(provider.provide, expect.any(InstanceWrapper));
      const [token, wrapper] = setSpy.mock.calls[0];
      expect(token).toBe(provider.provide);
      expect(wrapper).toBeInstanceOf(InstanceWrapper);
      expect(wrapper.name).toBe(provider.provide.name);
      expect(wrapper.host).toBeInstanceOf(CoreModule);
      expect(wrapper.host).toBe(moduleRef);
      expect(untypedModuleRef._providers.has(token)).toBe(true);
      expect(untypedModuleRef._providers.get(token)).toBeInstanceOf(InstanceWrapper);

      expect(factoryFn(provider.useExisting)).toEqual(type);
    });
  });

  describe("when get instance", () => {
    describe("when metatype does not exists in providers collection", () => {
      beforeEach(() => {
        spyOn(untypedModuleRef._providers, "has").mockReturnValue(false);
      });
      it("should throw RuntimeException", () => {
        expect(() => moduleRef.instance).toThrow(RuntimeException);
      });
    });
    describe("when metatype exists in providers collection", () => {
      it("should return null", () => {
        // @ts-expect-error Mismatch types
        expect(moduleRef.instance).toEqual(null);
      });
    });
  });

  describe("when exported provider is custom provided", () => {
    beforeEach(() => {
      spyOn(moduleRef, "validateExportedProvider").mockImplementation(o => o);
    });
    it("should call `addCustomExportedProvider`", () => {
      const addCustomExportedProviderSpy = spyOn(
        moduleRef,
        "addCustomExportedProvider"
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      moduleRef.addExportedProviderOrModule({ provide: "test" } as any);
      expect(addCustomExportedProviderSpy).toHaveBeenCalled();
    });
    it("should support symbols", () => {
      const addCustomExportedProviderSpy = spyOn(
        moduleRef,
        "addCustomExportedProvider"
      );
      const symb = Symbol("test");
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      moduleRef.addExportedProviderOrModule({ provide: symb } as any);
      expect(addCustomExportedProviderSpy).toHaveBeenCalled();
      expect(untypedModuleRef._exports.has(symb)).toBe(true);
    });
  });

  describe("replace", () => {
    describe("when provider", () => {
      it("should call `mergeWith`", () => {
        const wrapper = {
          mergeWith: mock(),
        };
        spyOn(moduleRef, "hasProvider").mockImplementation(() => true);
        spyOn(moduleRef.providers, "get").mockImplementation(() => wrapper as any);

        moduleRef.replace(null!, { isProvider: true });
        expect(wrapper.mergeWith).toHaveBeenCalled();
      });
    });
    describe("when guard", () => {
      it("should call `mergeWith`", () => {
        const wrapper = {
          mergeWith: mock(),
          isProvider: true,
        };
        spyOn(moduleRef, "hasInjectable").mockImplementation(() => true);
        spyOn(moduleRef.injectables, "get")
          .mockImplementation(() => wrapper as any);

        moduleRef.replace(null!, {});
        expect(wrapper.mergeWith).toHaveBeenCalled();
      });
    });
  });

  describe("imports", () => {
    it("should return relatedModules", () => {
      const test = ["test"];
      untypedModuleRef._imports = test;
      // @ts-expect-error Mismatch types
      expect(moduleRef.imports).toEqual(test);
    });
  });

  describe("injectables", () => {
    it("should return injectables", () => {
      const test = ["test"];
      untypedModuleRef._injectables = test;
      // @ts-expect-error Mismatch types
      expect(moduleRef.injectables).toEqual(test);
    });
  });

  describe("exports", () => {
    it("should return exports", () => {
      const test = ["test"];
      untypedModuleRef._exports = test;
      // @ts-expect-error Mismatch types
      expect(moduleRef.exports).toEqual(test);
    });
  });

  describe("providers", () => {
    it("should return providers", () => {
      const test = ["test"];
      untypedModuleRef._providers = test;
      // @ts-expect-error Mismatch types
      expect(moduleRef.providers).toEqual(test);
    });
  });

  describe("createModuleReferenceType", () => {
    let customModuleRef: any;

    beforeEach(() => {
      const Class = moduleRef.createModuleReferenceType();
      customModuleRef = new Class();
    });

    it('should return metatype with "get" method', () => {
      expect(!!customModuleRef.get).toBe(true);
    });
    describe("get", () => {
      it("should throw exception if not exists", () => {
        expect(() => customModuleRef.get("fail")).toThrow(
          UnknownElementException
        );
      });
    });
  });
  describe("validateExportedProvider", () => {
    const token = "token";

    describe("when unit exists in provider collection", () => {
      it("should behave as identity", () => {
        untypedModuleRef._providers = new Map([[token, true]]);
        expect(moduleRef.validateExportedProvider(token)).toEqual(token);
      });
    });
    describe("when unit exists in related modules collection", () => {
      it("should behave as identity", () => {
        class Random {}
        untypedModuleRef._imports = new Set([new CoreModule(Random, new VenokContainer())]);
        expect(moduleRef.validateExportedProvider(Random)).toEqual(Random);
      });
    });
    describe("when unit does not exist in both provider and related modules collections", () => {
      it("should throw UnknownExportException", () => {
        expect(() => moduleRef.validateExportedProvider(token)).toThrow(
          UnknownExportException
        );
      });
    });
  });

  describe("hasProvider", () => {
    describe("when module has provider", () => {
      it("should return true", () => {
        const token = "test";
        moduleRef.providers.set(token, new InstanceWrapper());
        expect(moduleRef.hasProvider(token)).toBe(true);
      });
    });
    describe("otherwise", () => {
      it("should return false", () => {
        expect(moduleRef.hasProvider("_")).toBe(false);
      });
    });
  });

  describe("hasInjectable", () => {
    describe("when module has injectable", () => {
      it("should return true", () => {
        const token = "test";
        moduleRef.injectables.set(token, new InstanceWrapper());
        expect(moduleRef.hasInjectable(token)).toBe(true);
      });
    });
    describe("otherwise", () => {
      it("should return false", () => {
        expect(moduleRef.hasInjectable("_")).toBe(false);
      });
    });
  });

  describe('getter "id"', () => {
    it("should return module id", () => {
      expect(moduleRef.id).toEqual(moduleRef["_id"]);
    });
  });

  describe("getProviderByKey", () => {
    describe("when does not exist", () => {
      it("should return undefined", () => {
        expect(moduleRef.getProviderByKey("test")).toBeUndefined();
      });
    });
    describe("otherwise", () => {
      it("should return instance wrapper", () => {
        moduleRef.addProvider(TestProvider);
        expect(moduleRef.getProviderByKey(TestProvider)).not.toBeUndefined();
      });
    });
  });

  describe("Additional coverage tests", () => {
    describe("name getter", () => {
      it("should return metatype name", () => {
        expect(moduleRef.name).toBe("TestModule");
      });
    });

    describe("isGlobal property", () => {
      it("should return false by default", () => {
        expect(moduleRef.isGlobal).toBe(false);
      });

      it("should set and get isGlobal", () => {
        moduleRef.isGlobal = true;
        expect(moduleRef.isGlobal).toBe(true);
      });
    });

    describe("initOnPreview property", () => {
      it("should return false by default", () => {
        expect(moduleRef.initOnPreview).toBe(false);
      });

      it("should set and get initOnPreview", () => {
        moduleRef.initOnPreview = true;
        expect(moduleRef.initOnPreview).toBe(true);
      });
    });

    describe("entryProviders getter", () => {
      it("should return empty array when no entry providers", () => {
        expect(moduleRef.entryProviders).toEqual([]);
      });

      it("should return entry providers", () => {
        // Add a provider with ENTRY_PROVIDER_WATERMARK
        const entryProvider = class EntryProvider {};
        Reflect.defineMetadata(ENTRY_PROVIDER_WATERMARK, true, entryProvider);
        moduleRef.addProvider(entryProvider);
        
        const entryProviders = moduleRef.entryProviders;
        expect(entryProviders.length).toBeGreaterThan(0);
        expect(entryProviders[0]).toBeInstanceOf(InstanceWrapper);
      });
    });

    describe("metatype getter", () => {
      it("should return the module metatype", () => {
        expect(moduleRef.metatype).toBe(TestModule);
      });
    });

    describe("distance property", () => {
      it("should return 0 by default", () => {
        expect(moduleRef.distance).toBe(0);
      });

      it("should set and get distance", () => {
        moduleRef.distance = 5;
        expect(moduleRef.distance).toBe(5);
      });
    });

    describe("isDynamicModule", () => {
      it("should return false for non-dynamic module", () => {
        expect(moduleRef.isDynamicModule({})).toBeFalsy();
        expect(moduleRef.isDynamicModule(null)).toBeFalsy();
        expect(moduleRef.isDynamicModule(undefined)).toBeFalsy();
      });

      it("should return truthy for dynamic module", () => {
        const dynamicModule = { module: TestModule };
        expect(moduleRef.isDynamicModule(dynamicModule)).toBeTruthy();
      });
    });

    describe("getProviderById", () => {
      it("should return undefined when provider not found", () => {
        const result = moduleRef.getProviderById("nonexistent-id");
        expect(result).toBeUndefined();
      });

      it("should return provider when found by id", () => {
        moduleRef.addProvider(TestProvider);
        const providers = Array.from(moduleRef.providers.values());
        const providerId = providers[0].id;
        
        const result = moduleRef.getProviderById(providerId);
        expect(result).toBeDefined();
        expect(result?.id).toBe(providerId);
      });
    });

    describe("getInjectableById", () => {
      it("should return undefined when injectable not found", () => {
        const result = moduleRef.getInjectableById("nonexistent-id");
        expect(result).toBeUndefined();
      });

      it("should return injectable when found by id", () => {
        moduleRef.addInjectable(TestProvider, "interceptor");
        const injectables = Array.from(moduleRef.injectables.values());
        const injectableId = injectables[0].id;
        
        const result = moduleRef.getInjectableById(injectableId);
        expect(result).toBeDefined();
        expect(result?.id).toBe(injectableId);
      });
    });

    describe("createModuleReferenceType resolve and create methods", () => {
      let customModuleRef: any;

      beforeEach(() => {
        const Class = moduleRef.createModuleReferenceType();
        customModuleRef = new Class();
      });

      describe("resolve", () => {
        it("should call resolvePerContext with correct parameters", async () => {
          const resolvePerContextSpy = spyOn(customModuleRef, "resolvePerContext").mockResolvedValue("resolved");
          
          const result = await customModuleRef.resolve("TestToken");
          
          expect(resolvePerContextSpy).toHaveBeenCalled();
          expect(result).toBe("resolved");
        });

        it("should accept options parameter", async () => {
          const resolvePerContextSpy = spyOn(customModuleRef, "resolvePerContext").mockResolvedValue("resolved");
          
          const options = { strict: false, each: true };
          await customModuleRef.resolve("TestToken", undefined, options);
          
          expect(resolvePerContextSpy).toHaveBeenCalled();
        });
      });

      describe("create", () => {
        it("should throw InvalidClassException for invalid type", async () => {
          await expect(customModuleRef.create(null)).rejects.toThrow();
          await expect(customModuleRef.create({})).rejects.toThrow();
          await expect(customModuleRef.create("string")).rejects.toThrow();
        });

        it("should call instantiateClass for valid type", async () => {
          const instantiateClassSpy = spyOn(customModuleRef, "instantiateClass").mockResolvedValue(new TestProvider());
          
          const result = await customModuleRef.create(TestProvider);
          
          expect(instantiateClassSpy).toHaveBeenCalledWith(TestProvider, moduleRef, undefined);
          expect(result).toBeInstanceOf(TestProvider);
        });
      });
    });
  });
});