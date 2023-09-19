import { Module } from "@venok/core/injector/module/module";
import { VenokContainer } from "@venok/core/injector/container";
import { MetadataScanner } from "@venok/core/metadata-scanner";
import { GraphInspector } from "@venok/core/inspector/graph-inspector";
import { ModuleOverride } from "@venok/core/interfaces/modules/override.interface";
import { DynamicModule, ForwardReference, InjectionToken } from "@venok/core/interfaces/modules";
import { Scope, Type } from "@venok/core/interfaces";
import { ModuleDefinition } from "@venok/core/interfaces/modules/definition.interface";

interface ApplicationProviderWrapper {
  moduleKey: string;
  providerKey: string;
  type: InjectionToken;
  scope?: Scope;
}

interface ModulesScanParameters {
  moduleDefinition: ModuleDefinition;
  scope?: Type<unknown>[];
  ctxRegistry?: (ForwardReference | DynamicModule | Type<unknown>)[];
  overrides?: ModuleOverride[];
  lazy?: boolean;
}

export class DependenciesScanner {
  private readonly applicationProvidersApplyMap: ApplicationProviderWrapper[] = [];

  constructor(
    private readonly container: VenokContainer,
    private readonly metadataScanner: MetadataScanner,
    private readonly graphInspector: GraphInspector,
  ) {}

  public async scanForModules({
    moduleDefinition,
    lazy,
    scope = [],
    ctxRegistry = [],
    overrides = [],
  }: ModulesScanParameters): Promise<Module[]> {
    return Promise.resolve([]);
  }

  public async scanModulesForDependencies(modules: Map<string, Module> = this.container.getModules()) {}
}
