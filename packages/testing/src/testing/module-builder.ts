import type { ApplicationContextOptions, LoggerService, ModuleDefinition, ModuleMetadata } from "@venok/core";

import type { MockFactory, ModuleOverride, OverrideBy, OverrideByFactoryOptions, OverrideModule } from "~/interfaces/index.js";

import {
  ApplicationConfig,
  ApplicationContext,
  ConsoleLogger,
  DependenciesScanner,
  GraphInspector,
  Logger,
  MetadataScanner,
  Module,
  UuidFactory,
  UuidFactoryMode,
  VenokContainer
} from "@venok/core";

import { TestingInjector } from "~/testing/injector.js";
import { TestingInstanceLoader } from "~/testing/instance-loader.js";
import { TestingLogger } from "~/testing/logger.js";
import { NoopGraphInspector } from "./noop-graph-inspector.js";

/**
 * @publicApi
 */
export class TestingModuleBuilder {
  private readonly applicationConfig = new ApplicationConfig();
  private readonly container: VenokContainer;
  private readonly overloadsMap = new Map();
  private readonly moduleOverloadsMap = new Map<ModuleDefinition, ModuleDefinition>();
  private readonly module: any;
  private testingLogger!: LoggerService;
  private mocker?: MockFactory;

  constructor(
    private readonly metadataScanner: MetadataScanner,
    metadata: ModuleMetadata
  ) {
    this.container = new VenokContainer(this.applicationConfig);
    this.module = this.createModule(metadata);
  }

  public setLogger(testingLogger: LoggerService) {
    this.testingLogger = testingLogger;
    return this;
  }

  public overridePipe<T = any>(typeOrToken: T): OverrideBy {
    return this.override(typeOrToken, false);
  }

  public useMocker(mocker: MockFactory): TestingModuleBuilder {
    this.mocker = mocker;
    return this;
  }

  public overrideFilter<T = any>(typeOrToken: T): OverrideBy {
    return this.override(typeOrToken, false);
  }

  public overrideGuard<T = any>(typeOrToken: T): OverrideBy {
    return this.override(typeOrToken, false);
  }

  public overrideInterceptor<T = any>(typeOrToken: T): OverrideBy {
    return this.override(typeOrToken, false);
  }

  public overrideProvider<T = any>(typeOrToken: T): OverrideBy {
    return this.override(typeOrToken, true);
  }

  public overrideModule(moduleToOverride: ModuleDefinition): OverrideModule {
    return {
      useModule: newModule => {
        this.moduleOverloadsMap.set(moduleToOverride, newModule);
        return this;
      },
    };
  }

  public async compile(options: Pick<ApplicationContextOptions, "snapshot" | "preview"> = {}): Promise<ApplicationContext> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nest: any = require("@nestjs/common");
      if (nest) nest.Logger.overrideLogger(new ConsoleLogger());
    } catch { /* empty */ }
    
    this.applyLogger();

    UuidFactory.mode = options?.snapshot ? UuidFactoryMode.Deterministic : UuidFactoryMode.Random;
    const graphInspector: GraphInspector = options?.snapshot ? new GraphInspector(this.container) : NoopGraphInspector;

    const scanner = new DependenciesScanner(this.container, this.metadataScanner, graphInspector, this.applicationConfig);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await scanner.scan(this.module, { overrides: this.getModuleOverloads() });

    this.applyOverloadsMap();
    await this.createInstancesOfDependencies(graphInspector, options);
    scanner.applyApplicationProviders();

    const root = this.getRootModule();
    return new ApplicationContext(this.container, this.applicationConfig, options, root);
  }

  private override<T = any>(typeOrToken: T, isProvider: boolean): OverrideBy {
    const addOverload = (options: any) => {
      this.overloadsMap.set(typeOrToken, { ...options, isProvider });
      return this;
    };
    return this.createOverrideByBuilder(addOverload);
  }

  private createOverrideByBuilder(add: (provider: any) => TestingModuleBuilder): OverrideBy {
    return {
      useValue: value => add({ useValue: value }),
      useFactory: (options: OverrideByFactoryOptions) => add({ ...options, useFactory: options.factory }),
      useClass: metatype => add({ useClass: metatype }),
    };
  }

  private applyOverloadsMap() {
    const overloads = [...this.overloadsMap.entries()];
    overloads.forEach(([item, options]) => this.container.replace(item, options));
  }

  private getModuleOverloads(): ModuleOverride[] {
    const overloads = [...this.moduleOverloadsMap.entries()];
    return overloads.map(([moduleToReplace, newModule]) => ({
      moduleToReplace,
      newModule,
    }));
  }

  private getRootModule() {
    const modules = this.container.getModules().values();
    return modules.next().value!;
  }

  private async createInstancesOfDependencies(
    graphInspector: GraphInspector,
    options: { preview?: boolean }
  ) {
    const injector = new TestingInjector({ preview: options?.preview ?? false });
    const instanceLoader = new TestingInstanceLoader(this.container, injector, graphInspector);
    await instanceLoader.createInstancesOfDependencies(this.container.getModules(), this.mocker);
  }

  private createModule(metadata: ModuleMetadata) {
    class RootTestModule {}
    Module(metadata)(RootTestModule);
    return RootTestModule;
  }

  private applyLogger() {
    Logger.overrideLogger(this.testingLogger || new TestingLogger());
  }
}