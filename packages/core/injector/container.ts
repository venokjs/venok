import { DynamicModule, Provider } from "@venok/core/interfaces/modules";
import { Injectable, Type } from "@venok/core/interfaces";
import { Module } from "@venok/core/injector/module/module";
import { TokenFactory } from "@venok/core/injector/module/token-factory";
import { ModuleCompiler, ModuleFactory } from "@venok/core/injector/module/compiler";
import { ModulesContainer } from "@venok/core/injector/module/container";
import {
  CircularDependencyException,
  UndefinedForwardRefException,
  UnknownModuleException,
} from "@venok/core/errors/exceptions";
import { EnhancerSubtype, GLOBAL_MODULE_METADATA, REQUEST } from "@venok/core/constants";
import { ContextId } from "@venok/core/injector/instance/wrapper";
import { ApplicationConfig } from "@venok/core/application/config";
import { InitializeOnPreviewAllowlist } from "@venok/core/inspector/initialize-on-preview.allowlist";
import { DiscoverableMetaHostCollection } from "@venok/core/discovery/meta-host-collection";
import { SerializedGraph } from "@venok/core/inspector/serialized-graph";
import { InternalCoreModule } from "@venok/core/injector/internal-core-module/internal-core-module";

type ModuleMetatype = Type<any> | DynamicModule | Promise<DynamicModule>;
type ModuleScope = Type<any>[];

export class VenokContainer {
  private readonly globalModules = new Set<Module>();
  private readonly moduleTokenFactory = new TokenFactory();
  private readonly moduleCompiler = new ModuleCompiler(this.moduleTokenFactory);
  private readonly modules = new ModulesContainer();
  private readonly dynamicModulesMetadata = new Map<string, Partial<DynamicModule>>();
  private readonly _serializedGraph = new SerializedGraph();
  private internalCoreModule!: Module;

  constructor(private readonly _applicationConfig: ApplicationConfig | undefined = undefined) {}

  get serializedGraph(): SerializedGraph {
    return this._serializedGraph;
  }

  get applicationConfig(): ApplicationConfig | undefined {
    return this._applicationConfig;
  }

  public async addModule(
    metatype: ModuleMetatype | undefined,
    scope: ModuleScope,
  ): Promise<
    | {
        moduleRef: Module;
        inserted: boolean;
      }
    | undefined
  > {
    // In DependenciesScanner#scanForModules we already check for undefined or invalid modules
    // We still need to catch the edge-case of `forwardRef(() => undefined)`
    if (!metatype) {
      throw new UndefinedForwardRefException(scope);
    }
    const { type, dynamicMetadata, token } = await this.moduleCompiler.compile(metatype);
    if (this.modules.has(token)) {
      return {
        moduleRef: this.modules.get(token) as Module,
        inserted: true,
      };
    }

    return {
      moduleRef: (await this.setModule(
        {
          token,
          type,
          dynamicMetadata,
        },
        scope,
      )) as Module,
      inserted: true,
    };
  }

  public async replaceModule(
    metatypeToReplace: ModuleMetatype,
    newMetatype: ModuleMetatype,
    scope: ModuleScope,
  ): Promise<
    | {
        moduleRef: Module;
        inserted: boolean;
      }
    | undefined
  > {
    // In DependenciesScanner#scanForModules we already check for undefined or invalid modules
    // We still need to catch the edge-case of `forwardRef(() => undefined)`
    if (!metatypeToReplace || !newMetatype) {
      throw new UndefinedForwardRefException(scope);
    }

    const { token } = await this.moduleCompiler.compile(metatypeToReplace);
    const { type, dynamicMetadata } = await this.moduleCompiler.compile(newMetatype);

    return {
      moduleRef: (await this.setModule(
        {
          token,
          type,
          dynamicMetadata,
        },
        scope,
      )) as Module,
      inserted: false,
    };
  }

  private async setModule(
    { token, dynamicMetadata, type }: ModuleFactory,
    scope: ModuleScope,
  ): Promise<Module | undefined> {
    const moduleRef = new Module(type, this);
    moduleRef.token = token;
    moduleRef.initOnPreview = this.shouldInitOnPreview(type);
    this.modules.set(token, moduleRef);

    // Maybe Error
    const updatedScope: Type[] = scope.concat(type);
    await this.addDynamicMetadata(token, dynamicMetadata, updatedScope);

    if (this.isGlobalModule(type, dynamicMetadata)) {
      moduleRef.isGlobal = true;
      this.addGlobalModule(moduleRef);
    }

    return moduleRef;
  }

  public async addDynamicMetadata(
    token: string,
    dynamicModuleMetadata: Partial<DynamicModule> | undefined,
    scope: Type<any>[],
  ) {
    if (!dynamicModuleMetadata) {
      return;
    }
    this.dynamicModulesMetadata.set(token, dynamicModuleMetadata);

    const { imports } = dynamicModuleMetadata;
    await this.addDynamicModules(imports, scope);
  }

  public async addDynamicModules(modules: any[] | undefined, scope: Type<any>[]) {
    if (!modules) {
      return;
    }
    await Promise.all(modules.map((module) => this.addModule(module, scope)));
  }

  public isGlobalModule(metatype: Type<any>, dynamicMetadata?: Partial<DynamicModule>): boolean {
    if (dynamicMetadata && dynamicMetadata.global) {
      return true;
    }
    return !!Reflect.getMetadata(GLOBAL_MODULE_METADATA, metatype);
  }

  public addGlobalModule(module: Module) {
    this.globalModules.add(module);
  }

  public getModules(): ModulesContainer {
    return this.modules;
  }

  public getModuleCompiler(): ModuleCompiler {
    return this.moduleCompiler;
  }

  public getModuleByKey(moduleKey: string): Module {
    return this.modules.get(moduleKey) as Module;
  }

  public getInternalCoreModuleRef(): Module | undefined {
    return this.internalCoreModule;
  }

  public async addImport(relatedModule: Type<any> | DynamicModule, token: string) {
    if (!this.modules.has(token)) {
      return;
    }
    const moduleRef = this.modules.get(token) as Module;
    const { token: relatedModuleToken } = await this.moduleCompiler.compile(relatedModule);
    const related = this.modules.get(relatedModuleToken) as Module;
    moduleRef.addImport(related);
  }

  public addProvider(provider: Provider, token: string, enhancerSubtype?: EnhancerSubtype): string | symbol | Function {
    const moduleRef = this.modules.get(token);
    if (!provider) {
      throw new CircularDependencyException(moduleRef?.metatype.name);
    }
    if (!moduleRef) {
      throw new UnknownModuleException();
    }
    const providerKey = moduleRef.addProvider(provider, enhancerSubtype);
    const providerRef = moduleRef.getProviderByKey(providerKey);

    DiscoverableMetaHostCollection.inspectProvider(this.modules, providerRef);

    return providerKey as Function;
  }

  public addInjectable(injectable: Provider, token: string, enhancerSubtype: EnhancerSubtype, host?: Type<Injectable>) {
    if (!this.modules.has(token)) {
      throw new UnknownModuleException();
    }
    const moduleRef = this.modules.get(token) as Module;
    return moduleRef.addInjectable(injectable, enhancerSubtype, host);
  }

  public addExportedProvider(provider: Type<any>, token: string) {
    if (!this.modules.has(token)) {
      throw new UnknownModuleException();
    }
    const moduleRef = this.modules.get(token) as Module;
    moduleRef.addExportedProvider(provider);
  }

  public clear() {
    this.modules.clear();
  }

  public replace(toReplace: any, options: any & { scope: any[] | null }) {
    this.modules.forEach((moduleRef) => moduleRef.replace(toReplace, options));
  }

  public bindGlobalScope() {
    this.modules.forEach((moduleRef) => this.bindGlobalsToImports(moduleRef));
  }

  public bindGlobalsToImports(moduleRef: Module) {
    this.globalModules.forEach((globalModule) => this.bindGlobalModuleToModule(moduleRef, globalModule));
  }

  public bindGlobalModuleToModule(target: Module, globalModule: Module) {
    if (target === globalModule || target === this.internalCoreModule) {
      return;
    }
    target.addImport(globalModule);
  }

  public getDynamicMetadataByToken(token: string): Partial<DynamicModule>;
  public getDynamicMetadataByToken<K extends Exclude<keyof DynamicModule, "global" | "module">>(
    token: string,
    metadataKey: K,
  ): DynamicModule[K];
  public getDynamicMetadataByToken(token: string, metadataKey?: Exclude<keyof DynamicModule, "global" | "module">) {
    const metadata = this.dynamicModulesMetadata.get(token);
    return metadataKey ? metadata?.[metadataKey] ?? [] : metadata;
  }

  public registerCoreModuleRef(moduleRef: Module) {
    this.internalCoreModule = moduleRef;
    this.modules.set(InternalCoreModule.name, moduleRef);
  }

  public getModuleTokenFactory(): TokenFactory {
    return this.moduleTokenFactory;
  }

  public registerRequestProvider<T = any>(request: T, contextId: ContextId) {
    const wrapper = this.internalCoreModule.getProviderByKey(REQUEST);
    wrapper.setInstanceByContextId(contextId, {
      instance: request,
      isResolved: true,
    });
  }

  private shouldInitOnPreview(type: Type) {
    return InitializeOnPreviewAllowlist.has(type);
  }
}
