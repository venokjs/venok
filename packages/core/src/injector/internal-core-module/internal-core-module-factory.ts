import type { ModuleOverride } from "~/interfaces/modules/override.interface.js";
import type { GraphInspector } from "~/inspector/graph-inspector.js";
import type { DependenciesScanner } from "~/scanner.js";

import { Injector } from "~/injector/injector.js";
import { LazyModuleLoader } from "~/injector/module/lazy/loader.js";
import { ModulesContainer } from "~/injector/module/container.js";
import { VenokContainer } from "~/injector/container.js";
import { InternalCoreModule } from "~/injector/internal-core-module/internal-core-module.js";
import { ModuleCompiler } from "~/injector/module/compiler.js";
import { InstanceLoader } from "~/injector/instance/loader.js";

import { SerializedGraph } from "~/inspector/serialized-graph.js";

import { VenokContextCreator } from "~/context/context.js";

import { Logger } from "~/services/logger.service.js";

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
