import { VenokContainer } from "@venok/core/injector/container.js";
import { DependenciesScanner } from "@venok/core/scanner.js";
import { ModuleCompiler } from "@venok/core/injector/module/compiler.js";
import { GraphInspector } from "@venok/core/inspector/graph-inspector.js";
import type { ModuleOverride } from "@venok/core/interfaces/modules/override.interface.js";
import { Logger } from "@venok/core/services/logger.service.js";
import { LazyModuleLoader } from "@venok/core/injector/module/lazy/loader.js";
import { Injector } from "@venok/core/injector/injector.js";
import { InstanceLoader } from "@venok/core/injector/instance/loader.js";
import { InternalCoreModule } from "@venok/core/injector/internal-core-module/internal-core-module.js";
import { ModulesContainer } from "@venok/core/injector/module/container.js";
import { SerializedGraph } from "@venok/core/inspector/serialized-graph.js";
import { VenokContextCreator } from "@venok/core/context/context.js";

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
      {
        provide: VenokContainer,
        useValue: container,
      },
      {
        provide: VenokContextCreator,
        useValue: VenokContextCreator.fromContainer(container),
      },
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
