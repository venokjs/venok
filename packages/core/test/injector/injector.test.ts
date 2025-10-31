/* eslint-disable @typescript-eslint/no-unsafe-argument */
import type { PropertyDependency } from "~/interfaces/index.js";

import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

import { Injector } from "~/injector/injector.js";
import { Injectable } from "~/decorators/injectable.decorator.js";
import { Inject } from "~/decorators/inject.decorator.js";
import { Optional } from "~/decorators/optional.decorator.js";
import { Module } from "~/injector/module/module.js";
import { InstanceWrapper } from "~/injector/instance/wrapper.js";
import { VenokContainer } from "~/injector/container.js";
import { STATIC_CONTEXT } from "~/injector/constants.js";
import { PARAMTYPES_METADATA } from "~/constants.js";

describe("Injector", () => {
  let injector: Injector;

  beforeEach(() => {
    injector = new Injector();
  });

  describe("loadInstance", () => {
    @Injectable()
    class DependencyOne {}

    @Injectable()
    class DependencyTwo {}

    @Injectable()
    class MainTest {
      @Inject() property!: DependencyOne;

      constructor(
        public one: DependencyOne,
        @Inject() public two: DependencyTwo
      ) {}
    }

    let moduleDeps: Module;
    let mainTest: InstanceWrapper, depOne: InstanceWrapper, depTwo: InstanceWrapper;

    beforeEach(() => {
      moduleDeps = new Module(DependencyTwo, new VenokContainer());
      mainTest = new InstanceWrapper({
        name: "MainTest",
        token: "MainTest",
        metatype: MainTest,
        instance: Object.create(MainTest.prototype),
        isResolved: false,
      });
      depOne = new InstanceWrapper({
        // @ts-expect-error Mismatch types
        name: DependencyOne,
        token: DependencyOne,
        metatype: DependencyOne,
        instance: Object.create(DependencyOne.prototype),
        isResolved: false,
      });
      depTwo = new InstanceWrapper({
        // @ts-expect-error Mismatch types
        name: DependencyTwo,
        token: DependencyTwo,
        metatype: DependencyTwo,
        instance: Object.create(DependencyTwo.prototype),
        isResolved: false,
      });
      moduleDeps.providers.set("MainTest", mainTest);
      moduleDeps.providers.set(DependencyOne, depOne);
      moduleDeps.providers.set(DependencyTwo, depTwo);
      moduleDeps.providers.set("MainTestResolved", {
        ...mainTest,
        // @ts-expect-error Mismatch types
        isResolved: true,
      });
    });

    it("should create an instance of component with proper dependencies", async () => {
      await injector.loadInstance(mainTest, moduleDeps.providers, moduleDeps);
      const { instance } = moduleDeps.providers.get(
        "MainTest"
      ) as InstanceWrapper<MainTest>;

      expect(instance!.one).toBeInstanceOf(DependencyOne);
      expect(instance!.two).toBeInstanceOf(DependencyTwo);
      expect(instance).toBeInstanceOf(MainTest);
    });

    it('should set "isResolved" property to true after instance initialization', async () => {
      await injector.loadInstance(mainTest, moduleDeps.providers, moduleDeps);
      const { isResolved } = (
        moduleDeps.providers.get("MainTest") as InstanceWrapper<MainTest>
      ).getInstanceByContextId(STATIC_CONTEXT);
      expect(isResolved).toBe(true);
    });

    it("should throw RuntimeException when type is not stored in collection", () => {
      return expect(
        injector.loadInstance({} as any, moduleDeps.providers, moduleDeps)
      ).rejects.toThrow();
    });

    it('should await done$ when "isPending"', async () => {
      const wrapper = new InstanceWrapper({
        name: "MainTest",
        metatype: MainTest,
        instance: Object.create(MainTest.prototype),
        isResolved: false,
      });
      const host = wrapper.getInstanceByContextId(STATIC_CONTEXT);
      host.donePromise = Promise.resolve();
      host.isPending = true;

      expect(injector.loadInstance(wrapper, moduleDeps.providers, moduleDeps)).resolves.toBe(undefined);
    });

    it('should await done$ when "isPending" and rethrow an exception (if thrown)', () => {
      const error = new Error("Test error");
      const wrapper = new InstanceWrapper({
        name: "MainTest",
        metatype: MainTest,
        instance: Object.create(MainTest.prototype),
        isResolved: false,
      });
      const host = wrapper.getInstanceByContextId(STATIC_CONTEXT);
      host.donePromise = Promise.resolve(error);
      host.isPending = true;

      expect(
        injector.loadInstance(wrapper, moduleDeps.providers, moduleDeps)
      ).rejects.toThrow(error);
    });

    it("should return undefined when metatype is resolved", async () => {
      const result = await injector.loadInstance(
        new InstanceWrapper({
          name: "MainTestResolved",
          metatype: MainTest,
          instance: Object.create(MainTest.prototype),
          isResolved: true,
        }),
        moduleDeps.providers,
        moduleDeps
      );
      expect(result).toBeUndefined();
    });
  });

  describe("loadPrototype", () => {
    @Injectable()
    class Test {}

    let moduleDeps: Module;
    let test: InstanceWrapper;

    beforeEach(() => {
      moduleDeps = new Module(Test, new VenokContainer());
      test = new InstanceWrapper({
        name: "Test",
        token: "Test",
        metatype: Test,
        instance: null,
        isResolved: false,
      });
      moduleDeps.providers.set("Test", test);
    });

    it("should create prototype of instance", () => {
      injector.loadPrototype(test, moduleDeps.providers);
      expect(moduleDeps.providers.get("Test")!.instance).toEqual(
        Object.create(Test.prototype)
      );
    });

    it("should return undefined when collection is nil", () => {
      const result = injector.loadPrototype(test, null!);
      expect(result).toBeUndefined();
    });

    it("should return undefined when target isResolved", () => {
      const collection = {
        get: () => ({
          getInstanceByContextId: () => ({ isResolved: true }),
          createPrototype: () => {},
        }),
      };
      const result = injector.loadPrototype(test, collection as any);
      expect(result).toBeUndefined();
    });

    it('should return undefined when "inject" is not nil', () => {
      const collection = {
        get: () => new InstanceWrapper({ inject: [] }),
      };
      const result = injector.loadPrototype(test, collection as any);
      expect(result).toBeUndefined();
    });
  });

  describe("resolveSingleParam", () => {
    it('should throw "RuntimeException" when param is undefined', async () => {
      return expect(
        injector.resolveSingleParam(
          null!,
          undefined!,
          { index: 0, dependencies: [] },
          null!
        )
      ).rejects.toThrow();
    });
  });

  describe("loadInjectable", () => {
    let loadInstance: any;

    beforeEach(() => {
      loadInstance = mock();
      injector.loadInstance = loadInstance;
    });

    it('should call "loadInstance" with expected arguments', async () => {
      const module = { injectables: [] };
      const wrapper = { test: "test" };

      await injector.loadInjectable(wrapper as any, module as any);
      expect(loadInstance).toHaveBeenCalledWith(wrapper, module.injectables, module, STATIC_CONTEXT, undefined);
    });
  });

  describe("lookupComponent", () => {
    let lookupComponentInImports: any;
    const metatype = { name: "test", metatype: { name: "test" } };
    const wrapper = new InstanceWrapper({
      name: "Test",
      metatype: metatype as any,
      instance: null,
      isResolved: false,
    });
    beforeEach(() => {
      lookupComponentInImports = mock();
      (injector as any).lookupComponentInImports = lookupComponentInImports;
    });

    it("should return object from collection if exists", async () => {
      const instance = { test: 3 };
      const collection = {
        has: () => true,
        get: () => instance,
      };
      const result = await injector.lookupComponent(
        collection as any,
        null!,
        { name: metatype.name, index: 0, dependencies: [] },
        wrapper
      );
      // @ts-expect-error Mismatch types
      expect(result).toBe(instance);
    });

    it("should throw an exception if recursion happens", () => {
      const name = "RecursionService";
      const instance = { test: 3 };
      const collection = {
        has: () => true,
        get: () => instance,
      };
      const result = injector.lookupComponent(
        collection as any,
        null!,
        { name, index: 0, dependencies: [] },
        Object.assign(wrapper, {
          name,
        })
      );
      expect(result).rejects.toThrow();
    });

    it('should call "lookupComponentInImports" when object is not in collection', async () => {
      lookupComponentInImports.mockReturnValue({});
      const collection = {
        has: () => false,
      };
      await injector.lookupComponent(
        collection as any,
        null!,
        { name: metatype.name, index: 0, dependencies: [] },
        wrapper
      );
      expect(lookupComponentInImports).toHaveBeenCalled();
    });

    it('should throw "UnknownDependenciesException" when instanceWrapper is null and "exports" collection does not contain token', () => {
      lookupComponentInImports.mockReturnValue(null);
      const collection = {
        has: () => false,
      };
      const module = { exports: collection };
      expect(
        injector.lookupComponent(
          collection as any,
          module as any,
          { name: metatype.name, index: 0, dependencies: [] },
          wrapper
        )
      ).rejects.toThrow();
    });

    it('should not throw "UnknownDependenciesException" instanceWrapper is not null', () => {
      lookupComponentInImports.mockReturnValue({});
      const collection = {
        has: () => false,
      };
      const module = { exports: collection };
      expect(
        injector.lookupComponent(
          collection as any,
          module as any,
          { name: metatype.name, index: 0, dependencies: [] },
          wrapper
        )
      ).resolves.not.toBe({});
    });
  });

  describe("lookupComponentInImports", () => {
    let loadProvider: any;
    const metatype = { name: "test" };
    const module = {
      relatedModules: new Map(),
    };

    beforeEach(() => {
      loadProvider = mock();
      (injector as any).loadProvider = loadProvider;
    });

    it("should return null when there is no related modules", async () => {
      const result = await injector.lookupComponentInImports(
        module as any,
        "testToken",
        new InstanceWrapper()
      );
      expect(result).toBe(null);
    });

    it("should return null when related modules do not have appropriate component", () => {
      let moduleFixture = {
        relatedModules: new Map([
          [
            "key",
            {
              providers: {
                has: () => false,
              },
              exports: {
                has: () => true,
              },
            },
          ],
        ] as any),
      };
      expect(
        injector.lookupComponentInImports(
          moduleFixture as any,
          metatype as any,
          null!
        )
      ).resolves.toEqual(null);

      moduleFixture = {
        relatedModules: new Map([
          [
            "key",
            {
              providers: {
                has: () => true,
              },
              exports: {
                has: () => false,
              },
            },
          ],
        ] as any),
      };
      expect(
        injector.lookupComponentInImports(
          moduleFixture as any,
          metatype as any,
          null!
        )
      ).resolves.toEqual(null);
    });
  });

  describe("resolveParamToken", () => {
    let forwardRef: any;
    let wrapper: InstanceWrapper;
    let param: any;

    describe('when "forwardRef" property is not nil', () => {
      beforeEach(() => {
        forwardRef = "test";
        wrapper = {} as any;
        param = {
          forwardRef: () => forwardRef,
        };
      });
      it("return forwardRef() result", () => {
        expect(injector.resolveParamToken(wrapper, param)).toEqual(
          forwardRef
        );
      });
      it('set wrapper "forwardRef" property to true', () => {
        injector.resolveParamToken(wrapper, param);
        expect(wrapper.forwardRef).toBe(true);
      });
    });
    describe('when "forwardRef" property is nil', () => {
      beforeEach(() => {
        forwardRef = "test";
        wrapper = {} as any;
        param = {};
      });
      it('set wrapper "forwardRef" property to false', () => {
        injector.resolveParamToken(wrapper, param);
        expect(wrapper.forwardRef).toBeUndefined();
      });
      it("return param", () => {
        expect(injector.resolveParamToken(wrapper, param)).toEqual(param);
      });
    });
  });

  describe("resolveComponentHost", () => {
    let module: any;
    beforeEach(() => {
      module = {
        providers: [],
      };
    });

    describe("when instanceWrapper is not resolved and does not have forward ref", () => {
      it("should call loadProvider", async () => {
        const wrapper = new InstanceWrapper({ isResolved: false });

        const loadStub = spyOn(injector, "loadProvider").mockImplementation(() => null!);

        await injector.resolveComponentHost(module, wrapper);
        expect(loadStub).toHaveBeenCalled();
      });
      it("should not call loadProvider (isResolved)", async () => {
        const wrapper = new InstanceWrapper({ isResolved: true });
        const loadStub = spyOn(injector, "loadProvider").mockImplementation(() => null!);

        await injector.resolveComponentHost(module, wrapper);
        expect(loadStub).not.toHaveBeenCalled();
      });
      it("should not call loadProvider (forwardRef)", async () => {
        const wrapper = new InstanceWrapper({
          isResolved: false,
          forwardRef: true,
        });
        const loadStub = spyOn(injector, "loadProvider").mockImplementation(() => null!);

        await injector.resolveComponentHost(module, wrapper);
        expect(loadStub).not.toHaveBeenCalled();
      });
    });

    describe("when instanceWrapper has async property", () => {
      it("should await instance", async () => {
        spyOn(injector, "loadProvider").mockImplementation(() => null!);

        const instance = Promise.resolve(true);
        const wrapper = new InstanceWrapper({
          isResolved: false,
          forwardRef: true,
          async: true,
          instance,
        });

        const result = await injector.resolveComponentHost(module, wrapper);
        expect(result.instance).toBe(true);
      });
    });
  });

  describe("applyProperties", () => {
    describe("when instance is not an object", () => {
      it("should return undefined", () => {
        expect(injector.applyProperties("test", [])).toBeUndefined();
      });
    });

    describe("when instance is an object", () => {
      it("should apply each not nil property", () => {
        const properties = [
          { key: "one", instance: {} },
          { key: "two", instance: null },
          { key: "three", instance: true },
        ];
        const obj: Record<any, any> = {};
        injector.applyProperties(obj, properties as PropertyDependency[]);

        expect(obj.one).toEqual(properties[0].instance);
        expect(obj.two).toBeUndefined();
        expect(obj.three).toEqual(properties[2].instance);
      });
    });
  });

  describe("instantiateClass", () => {
    class TestClass {}

    describe("when context is static", () => {
      it("should instantiate class", async () => {
        const wrapper = new InstanceWrapper({ metatype: TestClass });
        await injector.instantiateClass([], wrapper, wrapper, STATIC_CONTEXT);

        expect(wrapper.instance).not.toBeUndefined();
        expect(wrapper.instance).toBeInstanceOf(TestClass);
      });
      it("should call factory", async () => {
        const wrapper = new InstanceWrapper({
          inject: [],
          metatype: (() => ({})) as any,
        });
        await injector.instantiateClass([], wrapper, wrapper, STATIC_CONTEXT);

        expect(wrapper.instance).not.toBeUndefined();
      });
    });
    describe("when context is not static", () => {
      it("should not instantiate class", async () => {
        const ctx = { id: 3 };
        const wrapper = new InstanceWrapper({ metatype: TestClass });
        await injector.instantiateClass([], wrapper, wrapper, ctx);

        expect(wrapper.instance).toBeUndefined();
        expect(wrapper.getInstanceByContextId(ctx).isResolved).toBe(true);
      });

      it("should not call factory", async () => {
        const wrapper = new InstanceWrapper({
          inject: [],
          metatype: mock() as any,
        });
        await injector.instantiateClass([], wrapper, wrapper, { id: 2 });
        expect(wrapper.instance).toBeUndefined();
        expect(wrapper.metatype as any).not.toHaveBeenCalled();
      });
    });
  });

  describe("loadPerContext", () => {
    class TestClass {}

    it("should load instance per context id", async () => {
      const container = new VenokContainer();
      const moduleCtor = class TestModule {};
      const ctx = STATIC_CONTEXT;
      const { moduleRef } = (await container.addModule(moduleCtor, []))!;

      moduleRef.addProvider({
        provide: TestClass,
        useClass: TestClass,
      });

      const instance = await injector.loadPerContext(
        new TestClass(),
        moduleRef,
        moduleRef.providers,
        ctx
      );
      expect(instance).toBeInstanceOf(TestClass);
    });
  });

  describe("loadEnhancersPerContext", () => {
    it("should load enhancers per context id", async () => {
      const wrapper = new InstanceWrapper();
      wrapper.addEnhancerMetadata(
        new InstanceWrapper({
          host: new Module(class {}, new VenokContainer()),
        })
      );
      wrapper.addEnhancerMetadata(
        new InstanceWrapper({
          host: new Module(class {}, new VenokContainer()),
        })
      );

      const loadInstanceStub = spyOn(injector, "loadInstance").mockImplementation(async () => ({}) as any);

      await injector.loadEnhancersPerContext(wrapper, STATIC_CONTEXT);
      expect(loadInstanceStub).toHaveBeenCalledTimes(2);
    });
  });

  describe("loadCtorMetadata", () => {
    it("should resolve ctor metadata", async () => {
      const wrapper = new InstanceWrapper();
      wrapper.addCtorMetadata(0, new InstanceWrapper());
      wrapper.addCtorMetadata(1, new InstanceWrapper());

      const resolveComponentHostStub = spyOn(injector, "resolveComponentHost").mockImplementation(async () => new InstanceWrapper());

      await injector.loadCtorMetadata(
        wrapper.getCtorMetadata(),
        STATIC_CONTEXT
      );
      expect(resolveComponentHostStub).toHaveBeenCalledTimes(2);
    });
  });

  describe("loadPropertiesMetadata", () => {
    it("should resolve properties metadata", async () => {
      const wrapper = new InstanceWrapper();
      wrapper.addPropertiesMetadata("key1", new InstanceWrapper());
      wrapper.addPropertiesMetadata("key2", new InstanceWrapper());

      const resolveComponentHostStub = spyOn(injector, "resolveComponentHost").mockImplementation(async () => new InstanceWrapper());

      await injector.loadPropertiesMetadata(
        wrapper.getPropertiesMetadata(),
        STATIC_CONTEXT
      );
      expect(resolveComponentHostStub).toHaveBeenCalledTimes(2);
    });
  });

  describe("resolveConstructorParams", () => {
    it('should call "loadCtorMetadata" if metadata is not undefined', async () => {
      const wrapper = new InstanceWrapper();
      const metadata: any[] = [];
      spyOn(wrapper, "getCtorMetadata").mockImplementation(() => metadata);

      const loadCtorMetadataSpy = spyOn(injector, "loadCtorMetadata");
      await injector.resolveConstructorParams(
        wrapper,
        null!,
        [],
        () => {
          expect(loadCtorMetadataSpy).toHaveBeenCalled();
        },
        { id: 2 }
      );
    });
  });

  describe("resolveProperties", () => {
    it('should call "loadPropertiesMetadata" if metadata is not undefined', async () => {
      const wrapper = new InstanceWrapper();
      const metadata: any[] = [];
      spyOn(wrapper, "getPropertiesMetadata").mockImplementation(() => metadata);

      const loadPropertiesMetadataSpy = spyOn(
        injector,
        "loadPropertiesMetadata"
      );
      await injector.resolveProperties(wrapper, null!, null!, { id: 2 });
      expect(loadPropertiesMetadataSpy).toHaveBeenCalled();
    });
  });

  describe("getClassDependencies", () => {
    it("should return an array that consists of deps and optional dep ids", async () => {
      class FixtureDep1 {}
      class FixtureDep2 {}

      @Injectable()
      class FixtureClass {
        constructor(
          private dep1: FixtureDep1,
          @Optional() private dep2: FixtureDep2
        ) {}
      }

      const wrapper = new InstanceWrapper({ metatype: FixtureClass });
      const [dependencies, optionalDependenciesIds] =
        injector.getClassDependencies(wrapper);

      expect(dependencies).toEqual([FixtureDep1, FixtureDep2]);
      expect(optionalDependenciesIds).toEqual([1]);
    });

    it("should not mutate the constructor metadata", async () => {
      class FixtureDep1 {}
      /** This needs to be something other than FixtureDep1 so the test can ensure that the metadata was not mutated */
      const injectionToken = "test_token";

      @Injectable()
      class FixtureClass {
        constructor(@Inject(injectionToken) private dep1: FixtureDep1) {}
      }

      const wrapper = new InstanceWrapper({ metatype: FixtureClass });
      const [dependencies] = injector.getClassDependencies(wrapper);
      expect(dependencies).toEqual([injectionToken]);

      const paramtypes = Reflect.getMetadata(PARAMTYPES_METADATA, FixtureClass);
      expect(paramtypes).toEqual([FixtureDep1]);
    });
  });

  describe("getFactoryProviderDependencies", () => {
    it("should return an array that consists of deps and optional dep ids", async () => {
      class FixtureDep1 {}
      class FixtureDep2 {}

      const wrapper = new InstanceWrapper({
        inject: [
          FixtureDep1,
          { token: FixtureDep2, optional: true },
          { token: FixtureDep2, optional: false },
          {} as any,
        ],
      });
      const [dependencies, optionalDependenciesIds] =
        injector.getFactoryProviderDependencies(wrapper);

      expect(dependencies).toEqual([
        FixtureDep1,
        FixtureDep2,
        FixtureDep2,
        // @ts-expect-error Mismatch types
        {},
      ]);
      expect(optionalDependenciesIds).toEqual([1]);
    });
  });

  describe("addDependencyMetadata", () => {
    interface IInjector extends Omit<Injector, "addDependencyMetadata"> {
      addDependencyMetadata: (
        keyOrIndex: symbol | string | number,
        hostWrapper: InstanceWrapper,
        instanceWrapper: InstanceWrapper
      ) => void;
    }

    let exposedInjector: IInjector;
    let hostWrapper: InstanceWrapper;
    let instanceWrapper: InstanceWrapper;

    beforeEach(() => {
      exposedInjector = injector as unknown as IInjector;
      hostWrapper = new InstanceWrapper();
      instanceWrapper = new InstanceWrapper();
    });

    it("should add dependency metadata to PropertiesMetadata when key is symbol", async () => {
      const addPropertiesMetadataSpy = spyOn(
        hostWrapper,
        "addPropertiesMetadata"
      );

      const key = Symbol.for("symbol");
      exposedInjector.addDependencyMetadata(key, hostWrapper, instanceWrapper);

      expect(addPropertiesMetadataSpy).toHaveBeenCalled();
    });

    it("should add dependency metadata to PropertiesMetadata when key is string", async () => {
      const addPropertiesMetadataSpy = spyOn(
        hostWrapper,
        "addPropertiesMetadata"
      );

      const key = "string";
      exposedInjector.addDependencyMetadata(key, hostWrapper, instanceWrapper);

      expect(addPropertiesMetadataSpy).toHaveBeenCalled();
    });

    it("should add dependency metadata to CtorMetadata when key is number", async () => {
      const addCtorMetadataSpy = spyOn(hostWrapper, "addCtorMetadata");

      const key = 0;
      exposedInjector.addDependencyMetadata(key, hostWrapper, instanceWrapper);

      expect(addCtorMetadataSpy).toHaveBeenCalled();
    });
  });
});