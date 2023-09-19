import { VenokContainer } from "@venok/core/injector/container";
import { Injector } from "@venok/core/injector/injector";
import { Logger, LoggerService } from "@venok/core/services/logger.service";
import { Module } from "@venok/core/injector/module/module";
import { Injectable } from "@venok/core/interfaces";
import { InternalCoreModule } from "@venok/core/injector/internal-core-module/internal-core-module";
import { MODULE_INIT_MESSAGE } from "@venok/core/helpers/messages.helper";
import { GraphInspector } from "@venok/core/inspector/graph-inspector";

export class InstanceLoader<TInjector extends Injector = Injector> {
  constructor(
    protected readonly container: VenokContainer,
    protected readonly injector: TInjector,
    protected readonly graphInspector: GraphInspector,
    private logger: LoggerService = new Logger(InstanceLoader.name, {
      timestamp: true,
    }),
  ) {}

  public setLogger(logger: Logger) {
    this.logger = logger;
  }

  public async createInstancesOfDependencies(modules: Map<string, Module> = this.container.getModules()) {
    this.createPrototypes(modules);

    try {
      await this.createInstances(modules);
    } catch (err) {
      this.graphInspector.inspectModules(modules);
      this.graphInspector.registerPartial(err);
      throw err;
    }
    this.graphInspector.inspectModules(modules);
  }

  private createPrototypes(modules: Map<string, Module>) {
    modules.forEach((moduleRef) => {
      this.createPrototypesOfProviders(moduleRef);
      this.createPrototypesOfInjectables(moduleRef);
    });
  }

  private async createInstances(modules: Map<string, Module>) {
    await Promise.all(
      [...modules.values()].map(async (moduleRef) => {
        await this.createInstancesOfProviders(moduleRef);
        await this.createInstancesOfInjectables(moduleRef);

        const { name } = moduleRef;
        this.isModuleWhitelisted(name) && this.logger.log(MODULE_INIT_MESSAGE`${name}`);
      }),
    );
  }

  private createPrototypesOfProviders(moduleRef: Module) {
    const { providers } = moduleRef;
    providers.forEach((wrapper) => this.injector.loadPrototype<Injectable>(wrapper, providers));
  }

  private async createInstancesOfProviders(moduleRef: Module) {
    const { providers } = moduleRef;
    const wrappers = [...providers.values()];
    await Promise.all(
      wrappers.map(async (item) => {
        await this.injector.loadProvider(item, moduleRef);
        this.graphInspector.inspectInstanceWrapper(item, moduleRef);
      }),
    );
  }

  private createPrototypesOfInjectables(moduleRef: Module) {
    const { injectables } = moduleRef;
    injectables.forEach((wrapper) => this.injector.loadPrototype(wrapper, injectables));
  }

  private async createInstancesOfInjectables(moduleRef: Module) {
    const { injectables } = moduleRef;
    const wrappers = [...injectables.values()];
    await Promise.all(
      wrappers.map(async (item) => {
        await this.injector.loadInjectable(item, moduleRef);
        this.graphInspector.inspectInstanceWrapper(item, moduleRef);
      }),
    );
  }

  private isModuleWhitelisted(name: string): boolean {
    return name !== InternalCoreModule.name;
  }
}
