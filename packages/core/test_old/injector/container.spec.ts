import "reflect-metadata";
import { expect } from "chai";
import sinon from "sinon";
import { VenokContainer } from "@venok/core/injector/container";
import { Module } from "@venok/core/decorators/module.decorator";
import { Global } from "@venok/core/decorators/global.decorator";
import { CircularDependencyException, UnknownModuleException } from "@venok/core/errors/exceptions";
import { Provider } from "@venok/core/interfaces/modules";
import { Type } from "@venok/core/interfaces";
import { EnhancerSubtype } from "@venok/core/constants";

describe("VenokContainer", () => {
  let container: VenokContainer;

  @Module({})
  class TestModule {}

  @Global()
  @Module({})
  class GlobalTestModule {}

  beforeEach(() => {
    container = new VenokContainer();
  });

  it('should "addProvider" throw "UnknownModuleException" when module is not stored in collection', () => {
    expect(() => container.addProvider({} as any, "TestModule")).throw(UnknownModuleException);
  });

  it('should "addProvider" throw "CircularDependencyException" when provider is nil', () => {
    expect(() => container.addProvider(null as unknown as Provider, "TestModule")).throw(CircularDependencyException);
  });

  it('should "addExportedProvider" throw "UnknownModuleException" when module is not stored in collection', () => {
    expect(() => container.addExportedProvider(null as unknown as Type, "TestModule")).throw(UnknownModuleException);
  });

  it('should "addInjectable" throw "UnknownModuleException" when module is not stored in collection', () => {
    expect(() =>
      container.addInjectable(null as unknown as Provider, "TestModule", null as unknown as EnhancerSubtype),
    ).throw(UnknownModuleException);
  });

  describe("clear", () => {
    it("should call `clear` on modules collection", () => {
      const clearSpy = sinon.spy((container as any).modules, "clear");
      container.clear();
      expect(clearSpy.called).to.be.true;
    });
  });

  describe("addModule", () => {
    it("should not add module if already exists in collection", async () => {
      const modules = new Map();
      const setSpy = sinon.spy(modules, "set");
      (container as any).modules = modules;

      await container.addModule(TestModule as any, []);
      await container.addModule(TestModule as any, []);

      expect(setSpy.calledOnce).to.be.true;
    });

    it("should throw an exception when metatype is not defined", () => {
      expect(container.addModule(undefined, [])).to.eventually.throws();
    });

    it("should add global module when module is global", async () => {
      const addGlobalModuleSpy = sinon.spy(container, "addGlobalModule");
      await container.addModule(GlobalTestModule as any, []);
      expect(addGlobalModuleSpy.calledOnce).to.be.true;
    });
  });

  describe("replaceModule", () => {
    it("should replace module if already exists in collection", async () => {
      @Module({})
      class ReplaceTestModule {}

      const modules = new Map();
      const setSpy = sinon.spy(modules, "set");
      (container as any).modules = modules;

      await container.addModule(TestModule as any, []);
      await container.replaceModule(TestModule as any, ReplaceTestModule as any, []);

      expect(setSpy.calledTwice).to.be.true;
    });

    it("should throw an exception when metatype is not defined", () => {
      expect(container.addModule(undefined, [])).to.eventually.throws();
    });

    it("should add global module when module is global", async () => {
      const addGlobalModuleSpy = sinon.spy(container, "addGlobalModule");
      await container.addModule(GlobalTestModule as any, []);
      expect(addGlobalModuleSpy.calledOnce).to.be.true;
    });
  });

  describe("isGlobalModule", () => {
    describe("when module is not globally scoped", () => {
      it("should return false", () => {
        expect(container.isGlobalModule(TestModule)).to.be.false;
      });
    });
    describe("when module is globally scoped", () => {
      it("should return true", () => {
        expect(container.isGlobalModule(GlobalTestModule)).to.be.true;
      });
    });
    describe("when dynamic module is globally scoped", () => {
      it("should return true", () => {
        expect(container.isGlobalModule(TestModule, { global: true })).to.be.true;
      });
    });
  });

  describe("bindGlobalsToImports", () => {
    it('should call "bindGlobalModuleToModule" for every global module', () => {
      const global1 = { test: 1 };
      const global2 = { test: 2 };

      container.addGlobalModule(global1 as any);
      container.addGlobalModule(global2 as any);

      const bindGlobalModuleToModuleSpy = sinon.spy(container, "bindGlobalModuleToModule");
      container.bindGlobalsToImports({
        addImport: sinon.spy(),
      } as any);
      expect(bindGlobalModuleToModuleSpy.calledTwice).to.be.true;
    });
  });

  describe("bindGlobalModuleToModule", () => {
    describe('when "module" is not "globalModule"', () => {
      it('should call "addImport"', () => {
        const module = { addImport: sinon.spy() };
        container.bindGlobalModuleToModule(module as any, null as any);
        expect(module.addImport.calledOnce).to.be.true;
      });
    });
    describe('when "module" is "globalModule"', () => {
      it('should not call "addImport"', () => {
        const module = { addImport: sinon.spy() };
        container.bindGlobalModuleToModule(module as any, module as any);
        expect(module.addImport.calledOnce).to.be.false;
      });
    });
  });

  describe("addDynamicMetadata", () => {
    let token: string;
    let collection: Map<string, any>;

    beforeEach(() => {
      token = "token";
      collection = new Map();
      (container as any).dynamicModulesMetadata = collection;
    });
    describe("when dynamic metadata exists", () => {
      it("should add to the dynamic metadata collection", () => {
        const addSpy = sinon.spy(collection, "set");
        const dynamicMetadata = { module: null };

        container.addDynamicMetadata(token, dynamicMetadata as any, []);
        expect(addSpy.calledWith(token, dynamicMetadata)).to.be.true;
      });
    });
    describe("when dynamic metadata does not exists", () => {
      it("should not add to the dynamic metadata collection", () => {
        const addSpy = sinon.spy(collection, "set");
        container.addDynamicMetadata(token, null as any, []);
        expect(addSpy.called).to.be.false;
      });
    });
  });

  class Test {}
  describe("addDynamicModules", () => {
    describe("when array is empty/undefined", () => {
      it('should not call "addModule"', () => {
        const addModuleSpy = sinon.spy(container, "addModule");
        container.addDynamicModules(undefined, []);
        expect(addModuleSpy.called).to.be.false;
      });
    });
    describe("when array is not empty/undefined", () => {
      it('should call "addModule"', () => {
        const addModuleSpy = sinon.spy(container, "addModule");
        container.addDynamicModules([Test] as any, []);
        expect(addModuleSpy.called).to.be.true;
      });
    });
  });

  describe("get applicationConfig", () => {
    it("should return ApplicationConfig instance", () => {
      expect(container.applicationConfig).to.be.eql((container as any)._applicationConfig);
    });
  });

  describe("getModuleByKey", () => {
    it("should return module by passed key", () => {
      const key = "test";
      const value = {};
      container.getModules().set(key, value as any);

      expect(container.getModuleByKey(key)).to.be.eql(value);
    });
  });

  describe("registerCoreModuleRef", () => {
    it("should register core module ref", () => {
      const ref = {} as any;
      container.registerCoreModuleRef(ref);
      expect((container as any).internalCoreModule).to.be.eql(ref);
    });
  });
});
