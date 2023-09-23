import "reflect-metadata";
import { expect } from "chai";
import { ModulesContainer } from "@venok/core/injector/module/container";
import { InternalCoreModuleFactory } from "@venok/core/injector/internal-core-module/internal-core-module-factory";
import { VenokContainer } from "@venok/core/injector/container";
import { InternalCoreModule } from "@venok/core/injector/internal-core-module/internal-core-module";
import { ClassProvider, FactoryProvider } from "@venok/core/interfaces/modules";
import { LazyModuleLoader } from "@venok/core/injector/module/lazy/loader";
import { SerializedGraph } from "@venok/core/inspector/serialized-graph";
import { ExternalContextCreator } from "@venok/core/context/external/creator";

describe("InternalCoreModuleFactory", () => {
  it("should return the internal core module definition", () => {
    const moduleDefinition = InternalCoreModuleFactory.create(
      new VenokContainer(),
      null as any,
      null as any,
      null as any,
      null as any,
    );

    expect(moduleDefinition.module).to.equal(InternalCoreModule);

    const providedInjectables = moduleDefinition.providers!.map(
      (item) => (item as ClassProvider | FactoryProvider).provide,
    );
    expect(providedInjectables).to.deep.equal([
      ExternalContextCreator,
      ModulesContainer,
      // HttpAdapterHost,
      LazyModuleLoader,
      SerializedGraph,
    ]);

    const lazyModuleLoaderProvider = moduleDefinition.providers!.find(
      (item) => (item as FactoryProvider)?.provide === LazyModuleLoader,
    ) as FactoryProvider;
    expect(lazyModuleLoaderProvider.useFactory()).to.be.instanceOf(LazyModuleLoader);
  });
});
