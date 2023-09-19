import "reflect-metadata";
import { expect } from "chai";
import { LazyModuleLoader } from "@venok/core/injector/module/lazy/loader";
import { DependenciesScanner } from "@venok/core/scanner";
import { InstanceLoader } from "@venok/core/injector/instance/loader";
import { ModulesContainer } from "@venok/core/injector/module/container";
import { GraphInspector } from "@venok/core/inspector/graph-inspector";
import { MetadataScanner } from "@venok/core/metadata-scanner";
import { Injector } from "@venok/core/injector/injector";
import { VenokContainer } from "@venok/core/injector/container";
import { ModuleRef } from "@venok/core/injector/module/ref";
import { Module } from "@venok/core/decorators/module.decorator";

describe("LazyModuleLoader", () => {
  let lazyModuleLoader: LazyModuleLoader;
  let dependenciesScanner: DependenciesScanner;
  let instanceLoader: InstanceLoader;
  let modulesContainer: ModulesContainer;

  class NoopLogger {
    log() {}
    error() {}
    warn() {}
  }

  beforeEach(() => {
    const nestContainer = new VenokContainer();
    const graphInspector = new GraphInspector(nestContainer);
    dependenciesScanner = new DependenciesScanner(nestContainer, new MetadataScanner(), graphInspector);

    const injector = new Injector();
    instanceLoader = new InstanceLoader(nestContainer, injector, graphInspector, new NoopLogger());
    modulesContainer = nestContainer.getModules();
    lazyModuleLoader = new LazyModuleLoader(
      dependenciesScanner,
      instanceLoader,
      nestContainer["moduleCompiler"],
      modulesContainer,
    );
  });
  describe("load", () => {
    const bProvider = { provide: "B", useValue: "B" };

    @Module({ providers: [bProvider], exports: [bProvider] })
    class ModuleB {}

    @Module({ imports: [ModuleB] })
    class ModuleA {}

    // describe("when module was not loaded yet", () => {
    //   it("should load it and return a module reference", async () => {
    //     const moduleRef = await lazyModuleLoader.load(() => ModuleA);
    //     console.log(moduleRef, ModuleRef);
    //     expect(moduleRef).to.be.instanceOf(ModuleRef);
    //     expect(moduleRef.get(bProvider.provide, { strict: false })).to.equal(bProvider.useValue);
    //   });
    // });
    describe("when module was loaded already", () => {
      @Module({})
      class ModuleC {}

      it("should return an existing module reference", async () => {
        const moduleRef = await lazyModuleLoader.load(() => ModuleC);
        const moduleRef2 = await lazyModuleLoader.load(() => ModuleC);
        expect(moduleRef).to.equal(moduleRef2);
      });
    });
  });
});
