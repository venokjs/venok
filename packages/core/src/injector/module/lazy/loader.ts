import type { DynamicModule, LazyModuleLoaderLoadOptions, Type } from "~/interfaces/index.js";
import type { ModuleOverride } from "~/interfaces/modules/override.interface.js";
import type { DependenciesScanner } from "~/scanner.js";

import { ModulesContainer } from "~/injector/module/container.js";
import { ModuleCompiler } from "~/injector/module/compiler.js";
import { Module } from "~/injector/module/module.js";
import { ModuleRef } from "~/injector/module/ref.js";
import { InstanceLoader } from "~/injector/instance/loader.js";
import { SilentLogger } from "~/helpers/silent.helper.js";

export class LazyModuleLoader {
  constructor(
    private readonly dependenciesScanner: DependenciesScanner,
    private readonly instanceLoader: InstanceLoader,
    private readonly moduleCompiler: ModuleCompiler,
    private readonly modulesContainer: ModulesContainer,
    private readonly moduleOverrides?: ModuleOverride[]
  ) {}

  public async load(
    loaderFn: () => Promise<Type | DynamicModule> | Type | DynamicModule,
    loadOpts?: LazyModuleLoaderLoadOptions
  ): Promise<ModuleRef> {
    this.registerLoggerConfiguration(loadOpts);

    const moduleClassOrDynamicDefinition = await loaderFn();
    const moduleInstances = await this.dependenciesScanner.scanForModules({
      moduleDefinition: moduleClassOrDynamicDefinition,
      overrides: this.moduleOverrides,
      lazy: true,
    });
    if (moduleInstances.length === 0) {
      // The module has been loaded already. In this case, we must
      // retrieve a module reference from the existing container.
      const { token } = await this.moduleCompiler.compile(moduleClassOrDynamicDefinition);
      const moduleInstance = this.modulesContainer.get(token) as Module;
      return moduleInstance && this.getTargetModuleRef(moduleInstance);
    }
    const lazyModulesContainer = this.createLazyModulesContainer(moduleInstances);
    await this.dependenciesScanner.scanModulesForDependencies(lazyModulesContainer);
    await this.instanceLoader.createInstancesOfDependencies(lazyModulesContainer);
    const [targetModule] = moduleInstances;
    return this.getTargetModuleRef(targetModule);
  }

  private registerLoggerConfiguration(loadOpts?: LazyModuleLoaderLoadOptions) {
    if (loadOpts?.logger === false) {
      this.instanceLoader.setLogger(new SilentLogger());
    }
  }

  private createLazyModulesContainer(moduleInstances: Module[]): Map<string, Module> {
    moduleInstances = Array.from(new Set(moduleInstances));
    return new Map(moduleInstances.map((ref) => [ref.token, ref]));
  }

  private getTargetModuleRef(moduleInstance: Module): ModuleRef {
    const moduleRefInstanceWrapper = moduleInstance.getProviderByKey(ModuleRef);
    return moduleRefInstanceWrapper.instance;
  }
}
