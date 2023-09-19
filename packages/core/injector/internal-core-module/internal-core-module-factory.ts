import { VenokContainer } from "@venok/core/injector/container";
import { DependenciesScanner } from "@venok/core/scanner";
import { ModuleCompiler } from "@venok/core/injector/module/compiler";
import { GraphInspector } from "@venok/core/inspector/graph-inspector";
import { ModuleOverride } from "@venok/core/interfaces/modules/override.interface";
import { Logger } from "@venok/core/services/logger.service";
import { LazyModuleLoader } from "@venok/core/injector/module/lazy/loader";
import { Injector } from "@venok/core/injector/injector";
import { InstanceLoader } from "@venok/core/injector/instance/loader";
import { InternalCoreModule } from "@venok/core/injector/internal-core-module/internal-core-module";
import { ModulesContainer } from "@venok/core/injector/module/container";
import { SerializedGraph } from "@venok/core/inspector/serialized-graph";

export class InternalCoreModuleFactory {
  static create(
    container: VenokContainer,
    scanner: DependenciesScanner,
    moduleCompiler: ModuleCompiler,
    graphInspector: GraphInspector,
    moduleOverrides?: ModuleOverride[],
  ) {
    const lazyModuleLoaderFactory = () => {
      const logger = new Logger(LazyModuleLoader.name, {
        timestamp: false,
      });
      const injector = new Injector();
      const instanceLoader = new InstanceLoader(container, injector, graphInspector, logger);
      return new LazyModuleLoader(scanner, instanceLoader, moduleCompiler, container.getModules(), moduleOverrides);
    };

    return InternalCoreModule.register([
      // {
      //   provide: ExternalContextCreator,
      //   useValue: ExternalContextCreator.fromContainer(container),
      // },
      {
        provide: ModulesContainer,
        useValue: container.getModules(),
      },
      {
        provide: LazyModuleLoader,
        useFactory: lazyModuleLoaderFactory,
      },
      {
        provide: SerializedGraph,
        useValue: container.serializedGraph,
      },
    ]);
  }
}
