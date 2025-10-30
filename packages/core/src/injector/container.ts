import type { ContextId, DynamicModule, ModuleFactory, Provider, Type } from "~/interfaces/index.js";
import type { InjectableToken } from "~/interfaces/injectable.interface.js";
import type { EnhancerSubtype } from "~/constants.js";

import { GLOBAL_MODULE_METADATA, REQUEST, REQUEST_CONTEXT_ID } from "~/constants.js";
import { Module } from "~/injector/module/module.js";
import { ModuleCompiler } from "~/injector/module/compiler.js";
import { ModulesContainer } from "~/injector/module/container.js";
import { TokenFactory } from "~/injector/module/token-factory.js";
import { InternalCoreModule } from "~/injector/internal-core-module/internal-core-module.js";
import { InitializeOnPreviewAllowlist } from "~/inspector/initialize-on-preview.allowlist.js";
import { ContextIdFactory } from "~/context/context-id.factory.js";
import { MetaHostStorage } from "~/storage/meta-host.storage.js";
import { SerializedGraph } from "~/inspector/serialized-graph.js";
import { ApplicationConfig } from "~/application/config.js";
import { CircularDependencyException } from "~/errors/exceptions/circular-dependency.exception.js";
import { UndefinedForwardRefException } from "~/errors/exceptions/undefined-forwardref.exception.js";
import { UnknownModuleException } from "~/errors/exceptions/unknown-module.exception.js";

type ModuleMetatype = Type | DynamicModule | Promise<DynamicModule>;
type ModuleScope = Type[];

export class VenokContainer {
  private readonly globalModules = new Set<Module>();
  private readonly moduleTokenFactory = new TokenFactory();
  private readonly moduleCompiler = new ModuleCompiler(this.moduleTokenFactory);
  private readonly modules = new ModulesContainer();
  private readonly dynamicModulesMetadata = new Map<string, Partial<DynamicModule>>();
  private readonly _serializedGraph = new SerializedGraph();
  private internalCoreModule!: Module;

  constructor(private readonly _applicationConfig: ApplicationConfig = new ApplicationConfig()) {}

  get serializedGraph(): SerializedGraph {
    return this._serializedGraph;
  }

  get applicationConfig(): ApplicationConfig {
    return this._applicationConfig;
  }

  public async addModule(
    metatype: ModuleMetatype | undefined,
    scope: ModuleScope
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
        scope
      )) as Module,
      inserted: true,
    };
  }

  public async replaceModule(
    metatypeToReplace: ModuleMetatype,
    newMetatype: ModuleMetatype,
    scope: ModuleScope
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
        scope
      )) as Module,
      inserted: false,
    };
  }

  private async setModule(
    { token, dynamicMetadata, type }: ModuleFactory,
    scope: ModuleScope
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
      /*
       * Set global module distance to MAX_VALUE to ensure their lifecycle hooks
       * are always executed first (when initializing the application)
       */
      moduleRef.distance = Number.MAX_VALUE;
      this.addGlobalModule(moduleRef);
    }

    return moduleRef;
  }

  public async addDynamicMetadata(
    token: string,
    dynamicModuleMetadata: Partial<DynamicModule> | undefined,
    scope: Type[]
  ) {
    if (!dynamicModuleMetadata) {
      return;
    }
    this.dynamicModulesMetadata.set(token, dynamicModuleMetadata);

    const { imports } = dynamicModuleMetadata;
    await this.addDynamicModules(imports, scope);
  }

  public async addDynamicModules(modules: any[] | undefined, scope: Type[]) {
    if (!modules) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await Promise.all(modules.map((module) => this.addModule(module, scope)));
  }

  public isGlobalModule(metatype: Type, dynamicMetadata?: Partial<DynamicModule>): boolean {
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

  public async addImport(relatedModule: Type | DynamicModule, token: string) {
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

    MetaHostStorage.inspectProvider(this.modules, providerRef);

    return providerKey as Function;
  }

  public addInjectable(
    injectable: Provider,
    token: string,
    enhancerSubtype: EnhancerSubtype,
    host?: Type<InjectableToken>
  ) {
    if (!this.modules.has(token)) {
      throw new UnknownModuleException();
    }
    const moduleRef = this.modules.get(token) as Module;
    return moduleRef.addInjectable(injectable, enhancerSubtype, host);
  }

  public addExportedProviderOrModule(provider: Type, token: string) {
    if (!this.modules.has(token)) {
      throw new UnknownModuleException();
    }
    const moduleRef = this.modules.get(token) as Module;
    moduleRef.addExportedProviderOrModule(provider);
  }

  public clear() {
    this.modules.clear();
  }

  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  public replace(toReplace: any, options: any & { scope: any[] | null }) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
    return metadataKey ? (metadata?.[metadataKey] ?? []) : metadata;
  }

  public registerCoreModuleRef(moduleRef: Module) {
    this.internalCoreModule = moduleRef;
    this.modules.set(InternalCoreModule.name, moduleRef);
  }

  public getModuleTokenFactory(): TokenFactory {
    return this.moduleTokenFactory;
  }

  public getContextId<T extends Record<any, unknown> = any>(request: T, isTreeDurable: boolean): ContextId {
    const contextId = ContextIdFactory.getByRequest(request);
    if (!request[REQUEST_CONTEXT_ID as any]) {
      Object.defineProperty(request, REQUEST_CONTEXT_ID, {
        value: contextId,
        enumerable: false,
        writable: false,
        configurable: false,
      });

      const requestProviderValue = isTreeDurable ? contextId.payload : request;
      this.registerRequestProvider(requestProviderValue, contextId);
    }
    return contextId;
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
