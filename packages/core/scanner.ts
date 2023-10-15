import {
  ClassProvider,
  DynamicModule,
  ExistingProvider,
  FactoryProvider,
  ForwardReference,
  InjectionToken,
  ModuleDefinition,
  Provider,
  Scope,
  Type,
  ValueProvider,
} from "@venok/core/interfaces";
import { ModuleOverride } from "@venok/core/interfaces/modules/override.interface";
import { MetadataScanner } from "@venok/core/metadata-scanner";
import { GraphInspector } from "@venok/core/inspector/graph-inspector";
import { ApplicationConfig } from "@venok/core/application/config";
import { VenokContainer } from "@venok/core/injector/container";
import { Module } from "@venok/core/injector/module/module";
import {
  APP_FILTER,
  APP_GUARD,
  APP_INTERCEPTOR,
  APP_PIPE,
  CATCH_WATERMARK,
  ENHANCER_KEY_TO_SUBTYPE_MAP,
  ENHANCER_TOKEN_TO_SUBTYPE_MAP,
  EnhancerSubtype,
  EXCEPTION_FILTERS_METADATA,
  GUARDS_METADATA,
  INJECTABLE_WATERMARK,
  INTERCEPTORS_METADATA,
  MODULE_METADATA,
  PIPES_METADATA,
  ROUTE_ARGS_METADATA,
} from "@venok/core/constants";
import { UndefinedModuleException } from "@venok/core/errors/exceptions/undefined-module.exception";
import { InvalidModuleException } from "@venok/core/errors/exceptions/invalid-module.exception";
import { InvalidClassModuleException } from "@venok/core/errors/exceptions/invalid-class-module.exception";
import { PipeTransform } from "@venok/core/interfaces/features/pipes.interface";
import { isFunction, isNull, isUndefined } from "@venok/core/helpers/shared.helper";
import { CircularDependencyException } from "@venok/core/errors/exceptions";
import { UuidFactory } from "@venok/core/helpers/uuid.helper";
import { getClassScope } from "@venok/core/injector/helpers/class-scope.helper";
import { InstanceWrapper } from "@venok/core/injector/instance/wrapper";
import { InternalCoreModuleFactory } from "@venok/core/injector/internal-core-module/internal-core-module-factory";
import { flatten } from "@venok/core/helpers/flatten.helper";
import { VenokInterceptor } from "@venok/core/interfaces/features/interceptor.interface";
import { CanActivate } from "@venok/core/interfaces/features/guards.interface";
import { ExceptionFilter } from "@venok/core/interfaces/features/exception-filter.interface";
import { Injectable } from "@venok/core/interfaces/injectable.interface";

interface ApplicationProviderWrapper {
  moduleKey: string;
  providerKey: string;
  type: InjectionToken;
  scope?: Scope;
}

interface ModulesScanParameters {
  moduleDefinition: ModuleDefinition;
  scope?: Type[];
  ctxRegistry?: (ForwardReference | DynamicModule | Type)[];
  overrides?: ModuleOverride[];
  lazy?: boolean;
}

export class DependenciesScanner {
  private readonly applicationProvidersApplyMap: ApplicationProviderWrapper[] = [];

  constructor(
    private readonly container: VenokContainer,
    private readonly metadataScanner: MetadataScanner,
    private readonly graphInspector: GraphInspector,
    private readonly applicationConfig = new ApplicationConfig(),
  ) {}

  public async scan(module: Type, options?: { overrides?: ModuleOverride[] }) {
    await this.registerCoreModule(options?.overrides);
    await this.scanForModules({
      moduleDefinition: module,
      overrides: options?.overrides,
    });
    await this.scanModulesForDependencies();
    this.calculateModulesDistance();

    this.addScopedEnhancersMetadata();
    this.container.bindGlobalScope();
  }

  public async scanForModules({
    moduleDefinition,
    lazy,
    scope = [],
    ctxRegistry = [],
    overrides = [],
  }: ModulesScanParameters): Promise<Module[]> {
    const { moduleRef: moduleInstance, inserted: moduleInserted } =
      (await this.insertOrOverrideModule(moduleDefinition, overrides, scope)) ?? {};

    moduleDefinition = this.getOverrideModuleByModule(moduleDefinition, overrides)?.newModule ?? moduleDefinition;

    moduleDefinition = moduleDefinition instanceof Promise ? await moduleDefinition : moduleDefinition;

    ctxRegistry.push(moduleDefinition);

    if (this.isForwardReference(moduleDefinition)) {
      moduleDefinition = (moduleDefinition as ForwardReference).forwardRef();
    }
    const modules = !this.isDynamicModule(moduleDefinition as Type | DynamicModule)
      ? this.reflectMetadata(MODULE_METADATA.IMPORTS, moduleDefinition as Type)
      : [
          ...this.reflectMetadata(MODULE_METADATA.IMPORTS, (moduleDefinition as DynamicModule).module),
          ...((moduleDefinition as DynamicModule).imports || []),
        ];

    let registeredModuleRefs: any[] = [];
    for (const [index, innerModule] of modules.entries()) {
      // In case of a circular dependency (ES module system), JavaScript will resolve the type to `undefined`.
      if (innerModule === undefined) {
        throw new UndefinedModuleException(moduleDefinition, index, scope);
      }
      if (!innerModule) {
        throw new InvalidModuleException(moduleDefinition, index, scope);
      }
      if (ctxRegistry.includes(innerModule)) {
        continue;
      }
      const moduleRefs = await this.scanForModules({
        moduleDefinition: innerModule,
        // Maybe Error
        scope: scope.concat(moduleDefinition as any),
        ctxRegistry,
        overrides,
        lazy,
      });
      registeredModuleRefs = registeredModuleRefs.concat(moduleRefs);
    }
    if (!moduleInstance) {
      return registeredModuleRefs;
    }

    if (lazy && moduleInserted) {
      this.container.bindGlobalsToImports(moduleInstance);
    }
    return [moduleInstance].concat(registeredModuleRefs);
  }

  public async insertModule(
    moduleDefinition: any,
    scope: Type[],
  ): Promise<
    | {
        moduleRef: Module;
        inserted: boolean;
      }
    | undefined
  > {
    const moduleToAdd = this.isForwardReference(moduleDefinition) ? moduleDefinition.forwardRef() : moduleDefinition;

    if (this.isInjectable(moduleToAdd) || this.isExceptionFilter(moduleToAdd)) {
      throw new InvalidClassModuleException(moduleDefinition, scope);
    }

    return this.container.addModule(moduleToAdd, scope);
  }

  public async scanModulesForDependencies(modules: Map<string, Module> = this.container.getModules()) {
    for (const [token, { metatype }] of modules) {
      await this.reflectImports(metatype, token, metatype.name);
      this.reflectProviders(metatype, token);
      this.reflectExports(metatype, token);
    }
  }

  public async reflectImports(module: Type, token: string, context: string) {
    const modules = [
      ...this.reflectMetadata(MODULE_METADATA.IMPORTS, module),
      ...(this.container.getDynamicMetadataByToken(token, MODULE_METADATA.IMPORTS as "imports") as any[]),
    ];
    for (const related of modules) {
      await this.insertImport(related, token, context);
    }
  }

  public reflectProviders(module: Type, token: string) {
    const providers = [
      ...this.reflectMetadata(MODULE_METADATA.PROVIDERS, module),
      ...(this.container.getDynamicMetadataByToken(token, MODULE_METADATA.PROVIDERS as "providers") as any[]),
    ];
    providers.forEach((provider) => {
      this.insertProvider(provider, token);
      this.reflectDynamicMetadata(provider, token);
    });
  }

  public reflectDynamicMetadata(cls: Type<Injectable>, token: string) {
    if (!cls || !cls.prototype) {
      return;
    }
    this.reflectInjectables(cls, token, GUARDS_METADATA);
    this.reflectInjectables(cls, token, INTERCEPTORS_METADATA);
    this.reflectInjectables(cls, token, EXCEPTION_FILTERS_METADATA);
    this.reflectInjectables(cls, token, PIPES_METADATA);
    this.reflectParamInjectables(cls, token, ROUTE_ARGS_METADATA);
  }

  public reflectExports(module: Type, token: string) {
    const exports = [
      ...this.reflectMetadata(MODULE_METADATA.EXPORTS, module),
      ...(this.container.getDynamicMetadataByToken(token, MODULE_METADATA.EXPORTS as "exports") as any[]),
    ];
    exports.forEach((exportedProvider) => this.insertExportedProvider(exportedProvider, token));
  }

  public reflectInjectables(
    component: Type<Injectable>,
    token: string,
    metadataKey: keyof typeof ENHANCER_KEY_TO_SUBTYPE_MAP,
  ) {
    const Injectables = this.reflectMetadata<Type<Injectable>>(metadataKey, component);
    const methodInjectables = this.metadataScanner.getAllMethodNames(component.prototype).reduce((acc, method) => {
      const methodInjectable = this.reflectKeyMetadata(component, metadataKey, method);

      if (methodInjectable) {
        acc.push(methodInjectable);
      }

      return acc;
    }, [] as any[]);

    Injectables.forEach((injectable) =>
      this.insertInjectable(injectable, token, component, ENHANCER_KEY_TO_SUBTYPE_MAP[metadataKey]),
    );
    methodInjectables.forEach((methodInjectable) => {
      methodInjectable.metadata.forEach((injectable: object) =>
        this.insertInjectable(
          injectable,
          token,
          component,
          ENHANCER_KEY_TO_SUBTYPE_MAP[metadataKey],
          methodInjectable.methodKey,
        ),
      );
    });
  }

  public reflectParamInjectables(component: Type<Injectable>, token: string, metadataKey: string) {
    const paramsMethods = this.metadataScanner.getAllMethodNames(component.prototype);

    paramsMethods.forEach((methodKey) => {
      const metadata: Record<
        string,
        {
          index: number;
          data: unknown;
          pipes: Array<Type<PipeTransform> | PipeTransform>;
        }
      > = Reflect.getMetadata(metadataKey, component, methodKey);

      if (!metadata) {
        return;
      }

      const params = Object.values(metadata);
      params
        .map((item) => item.pipes)
        .flat(1)
        .forEach((injectable) => this.insertInjectable(injectable, token, component, "pipe", methodKey));
    });
  }

  public reflectKeyMetadata(
    component: Type<Injectable>,
    key: string,
    methodKey: string,
  ): { methodKey: string; metadata: any } | undefined {
    let prototype = component.prototype;
    do {
      const descriptor = Reflect.getOwnPropertyDescriptor(prototype, methodKey);
      if (!descriptor) {
        continue;
      }
      const metadata = Reflect.getMetadata(key, descriptor.value);
      if (!metadata) {
        return;
      }
      return { methodKey, metadata };
    } while ((prototype = Reflect.getPrototypeOf(prototype)) && prototype !== Object.prototype && prototype);
    return undefined;
  }

  public calculateModulesDistance() {
    const modulesGenerator = this.container.getModules().values();

    // Skip "InternalCoreModule" from calculating distance
    modulesGenerator.next();

    const modulesStack: any[] = [];
    const calculateDistance = (moduleRef: Module, distance = 1) => {
      if (!moduleRef || modulesStack.includes(moduleRef)) {
        return;
      }
      modulesStack.push(moduleRef);

      const moduleImports = moduleRef.imports;
      moduleImports.forEach((importedModuleRef) => {
        if (importedModuleRef) {
          if (distance > importedModuleRef.distance) {
            importedModuleRef.distance = distance;
          }
          calculateDistance(importedModuleRef, distance + 1);
        }
      });
    };

    const rootModule = modulesGenerator.next().value as Module;
    calculateDistance(rootModule);
  }

  public async insertImport(related: any, token: string, context: string) {
    if (isUndefined(related)) {
      throw new CircularDependencyException(context);
    }
    if (this.isForwardReference(related)) {
      return this.container.addImport(related.forwardRef(), token);
    }
    await this.container.addImport(related, token);
  }

  public isCustomProvider(
    provider: Provider,
  ): provider is ClassProvider | ValueProvider | FactoryProvider | ExistingProvider {
    return provider && !isNull((provider as any).provide);
  }

  public insertProvider(provider: Provider, token: string) {
    const isCustomProvider = this.isCustomProvider(provider);
    if (!isCustomProvider) {
      return this.container.addProvider(provider as Type, token);
    }
    const applyProvidersMap = this.getApplyProvidersMap();
    const providersKeys = Object.keys(applyProvidersMap);
    const type = (provider as ClassProvider | ValueProvider | FactoryProvider | ExistingProvider).provide;

    if (!providersKeys.includes(type as string)) {
      return this.container.addProvider(provider as any, token);
    }
    const uuid = UuidFactory.get(type.toString());
    const providerToken = `${type as string} (UUID: ${uuid})`;

    let scope = (provider as ClassProvider | FactoryProvider).scope;
    if (isNull(scope) && (provider as ClassProvider).useClass) {
      scope = getClassScope((provider as ClassProvider).useClass);
    }
    this.applicationProvidersApplyMap.push({
      type,
      moduleKey: token,
      providerKey: providerToken,
      scope,
    });

    const newProvider = {
      ...provider,
      provide: providerToken,
      scope,
    } as Provider;

    const enhancerSubtype =
      ENHANCER_TOKEN_TO_SUBTYPE_MAP[
        type as typeof APP_GUARD | typeof APP_PIPE | typeof APP_FILTER | typeof APP_INTERCEPTOR
      ];
    const factoryOrClassProvider = newProvider as FactoryProvider | ClassProvider;
    if (this.isRequestOrTransient(factoryOrClassProvider.scope as any)) {
      return this.container.addInjectable(newProvider, token, enhancerSubtype);
    }
    this.container.addProvider(newProvider, token, enhancerSubtype);
  }

  public insertInjectable(
    injectable: Type<Injectable> | object,
    token: string,
    host: Type<Injectable>,
    subtype: EnhancerSubtype,
    methodKey?: string,
  ) {
    if (isFunction(injectable)) {
      const instanceWrapper = this.container.addInjectable(injectable as Type, token, subtype, host) as InstanceWrapper;

      this.graphInspector.insertEnhancerMetadataCache({
        moduleToken: token,
        classRef: host,
        enhancerInstanceWrapper: instanceWrapper,
        targetNodeId: instanceWrapper.id,
        subtype,
        methodKey,
      });
      return instanceWrapper;
    } else {
      this.graphInspector.insertEnhancerMetadataCache({
        moduleToken: token,
        classRef: host,
        enhancerRef: injectable,
        methodKey,
        subtype,
      });
    }
  }

  public insertExportedProvider(exportedProvider: Type<Injectable>, token: string) {
    this.container.addExportedProvider(exportedProvider, token);
  }

  private insertOrOverrideModule(
    moduleDefinition: ModuleDefinition,
    overrides: ModuleOverride[],
    scope: Type[],
  ): Promise<
    | {
        moduleRef: Module;
        inserted: boolean;
      }
    | undefined
  > {
    const overrideModule = this.getOverrideModuleByModule(moduleDefinition, overrides);
    if (overrideModule !== undefined) {
      return this.overrideModule(moduleDefinition, overrideModule.newModule, scope);
    }

    return this.insertModule(moduleDefinition, scope);
  }

  private getOverrideModuleByModule(module: ModuleDefinition, overrides: ModuleOverride[]): ModuleOverride | undefined {
    if (this.isForwardReference(module)) {
      return overrides.find((moduleToOverride) => {
        return (
          moduleToOverride.moduleToReplace === module.forwardRef() ||
          (moduleToOverride.moduleToReplace as ForwardReference).forwardRef?.() === module.forwardRef()
        );
      });
    }

    return overrides.find((moduleToOverride) => moduleToOverride.moduleToReplace === module);
  }

  private async overrideModule(
    moduleToOverride: ModuleDefinition,
    newModule: ModuleDefinition,
    scope: Type[],
  ): Promise<
    | {
        moduleRef: Module;
        inserted: boolean;
      }
    | undefined
  > {
    return this.container.replaceModule(
      this.isForwardReference(moduleToOverride) ? moduleToOverride.forwardRef() : moduleToOverride,
      this.isForwardReference(newModule) ? newModule.forwardRef() : newModule,
      scope,
    );
  }

  public reflectMetadata<T = any>(metadataKey: string, metatype: Type): T[] {
    return Reflect.getMetadata(metadataKey, metatype) || [];
  }

  public async registerCoreModule(overrides?: ModuleOverride[]) {
    const moduleDefinition = InternalCoreModuleFactory.create(
      this.container,
      this,
      this.container.getModuleCompiler(),
      this.graphInspector,
      overrides,
    );
    const [instance] = await this.scanForModules({
      moduleDefinition,
      overrides,
    });
    this.container.registerCoreModuleRef(instance);
  }

  /**
   * Add either request or transient globally scoped enhancers
   * to all controllers metadata storage
   */
  public addScopedEnhancersMetadata() {
    this.applicationProvidersApplyMap
      .filter((wrapper) => this.isRequestOrTransient(wrapper.scope as any))
      .forEach(({ moduleKey, providerKey }) => {
        const modulesContainer = this.container.getModules();
        const { injectables } = modulesContainer.get(moduleKey) as Module;
        const instanceWrapper = injectables.get(providerKey);

        const iterableIterator = modulesContainer.values();
        flatten([...iterableIterator].map((moduleRef) => moduleRef.entryProviders)).forEach((EntryProvider) =>
          EntryProvider.addEnhancerMetadata(instanceWrapper as any),
        );
      });
  }

  public applyApplicationProviders() {
    const applyProvidersMap = this.getApplyProvidersMap();
    const applyRequestProvidersMap = this.getApplyRequestProvidersMap();

    const getInstanceWrapper = (moduleKey: string, providerKey: string, collectionKey: "providers" | "injectables") => {
      const modules = this.container.getModules();
      const collection = modules.get(moduleKey)![collectionKey];
      return collection.get(providerKey);
    };

    // Add global enhancers to the application config
    this.applicationProvidersApplyMap.forEach(({ moduleKey, providerKey, type, scope }) => {
      let instanceWrapper: InstanceWrapper;
      if (this.isRequestOrTransient(scope as any)) {
        instanceWrapper = getInstanceWrapper(moduleKey, providerKey, "injectables") as InstanceWrapper<Injectable>;

        this.graphInspector.insertAttachedEnhancer(instanceWrapper);
        return applyRequestProvidersMap[type as string](instanceWrapper);
      }
      instanceWrapper = getInstanceWrapper(moduleKey, providerKey, "providers") as InstanceWrapper<Injectable>;
      this.graphInspector.insertAttachedEnhancer(instanceWrapper);
      applyProvidersMap[type as string](instanceWrapper.instance);
    });
  }

  public getApplyProvidersMap(): { [type: string]: Function } {
    return {
      [APP_INTERCEPTOR]: (interceptor: VenokInterceptor) => this.applicationConfig.addGlobalInterceptor(interceptor),
      [APP_PIPE]: (pipe: PipeTransform) => this.applicationConfig.addGlobalPipe(pipe),
      [APP_GUARD]: (guard: CanActivate) => this.applicationConfig.addGlobalGuard(guard),
      [APP_FILTER]: (filter: ExceptionFilter) => this.applicationConfig.addGlobalFilter(filter),
    };
  }

  public getApplyRequestProvidersMap(): { [type: string]: Function } {
    return {
      [APP_INTERCEPTOR]: (interceptor: InstanceWrapper<VenokInterceptor>) =>
        this.applicationConfig.addGlobalRequestInterceptor(interceptor),
      [APP_PIPE]: (pipe: InstanceWrapper<PipeTransform>) => this.applicationConfig.addGlobalRequestPipe(pipe),
      [APP_GUARD]: (guard: InstanceWrapper<CanActivate>) => this.applicationConfig.addGlobalRequestGuard(guard),
      [APP_FILTER]: (filter: InstanceWrapper<ExceptionFilter>) => this.applicationConfig.addGlobalRequestFilter(filter),
    };
  }

  public isDynamicModule(module: Type | DynamicModule): module is DynamicModule {
    return module && !!(module as DynamicModule).module;
  }

  /**
   * @param metatype
   * @returns `true` if `metatype` is annotated with the `@Injectable()` decorator.
   */
  private isInjectable(metatype: Type): boolean {
    return !!Reflect.getMetadata(INJECTABLE_WATERMARK, metatype);
  }

  /**
   * @param metatype
   * @returns `true` if `metatype` is annotated with the `@Catch()` decorator.
   */
  private isExceptionFilter(metatype: Type): boolean {
    return !!Reflect.getMetadata(CATCH_WATERMARK, metatype);
  }

  private isForwardReference(module: ModuleDefinition): module is ForwardReference {
    return module && !!(module as ForwardReference).forwardRef;
  }

  private isRequestOrTransient(scope: Scope): boolean {
    return scope === Scope.REQUEST || scope === Scope.TRANSIENT;
  }
}
