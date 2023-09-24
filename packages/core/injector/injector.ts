import { InjectionToken, OptionalFactoryDependency } from "@venok/core/interfaces/modules";
import {
  ContextId,
  InstancePerContext,
  InstanceWrapper,
  PropertyMetadata,
} from "@venok/core/injector/instance/wrapper";
import { STATIC_CONTEXT } from "@venok/core/injector/constants";
import { Logger, LoggerService } from "@venok/core/services/logger.service";
import { Module } from "@venok/core/injector/module/module";
import { CircularDependencyException, RuntimeException } from "@venok/core/errors/exceptions";
import { isFunction, isNull, isObject, isString, isSymbol, isUndefined } from "@venok/core/helpers/shared.helper";
import { Injectable, Type, WithRequired } from "@venok/core/interfaces";
import { SettlementSignal } from "@venok/core/injector/settlement-signal";
import {
  INQUIRER,
  OPTIONAL_DEPS_METADATA,
  OPTIONAL_PROPERTY_DEPS_METADATA,
  PARAMTYPES_METADATA,
  PROPERTY_DEPS_METADATA,
  SELF_DECLARED_DEPS_METADATA,
} from "@venok/core/constants";
import { UndefinedDependencyException } from "@venok/core/errors/exceptions/undefined-dependency.exception";
import { UnknownDependenciesException } from "@venok/core/errors/exceptions/unknown-dependencies.exception";
import { colors } from "@venok/core/helpers/color.helper";

/**
 * The type of injectable dependency
 */
export type InjectorDependency = InjectionToken;

/**
 * The property-based dependency
 */
export interface PropertyDependency {
  key: symbol | string;
  name: InjectorDependency;
  isOptional?: boolean;
  instance?: any;
}

/**
 * Context of a dependency which gets injected by
 * the injector
 */
export interface InjectorDependencyContext {
  /**
   * The name of the property key (property-based injection)
   */
  key?: string | symbol;
  /**
   * The function itself, the name of the function, or injection token.
   */
  name?: Function | string | symbol;
  /**
   * The index of the dependency which gets injected
   * from the dependencies array
   */
  index?: number;
  /**
   * The dependency array which gets injected
   */
  dependencies?: InjectorDependency[];
}

export class Injector {
  private logger: LoggerService = new Logger("InjectorLogger");

  constructor(private readonly options?: { preview: boolean }) {}

  public loadPrototype<T>(
    { token }: InstanceWrapper<T>,
    collection: Map<InjectionToken, InstanceWrapper<T>>,
    contextId = STATIC_CONTEXT,
  ) {
    if (!collection) {
      return;
    }
    const target = collection.get(token) as InstanceWrapper;
    const instance = target.createPrototype(contextId);
    if (instance) {
      const wrapper = new InstanceWrapper({
        ...target,
        instance,
      });
      collection.set(token, wrapper);
    }
  }

  public async loadInstance<T>(
    wrapper: InstanceWrapper<T>,
    collection: Map<InjectionToken, InstanceWrapper>,
    moduleRef: Module,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
  ) {
    const inquirerId = this.getInquirerId(inquirer);
    const instanceHost = wrapper.getInstanceByContextId(this.getContextId(contextId, wrapper), inquirerId);

    // Maybe Error
    if (instanceHost.isPending && instanceHost.donePromise) {
      const settlementSignal = wrapper.settlementSignal;
      if (inquirer && settlementSignal?.isCycle(inquirer.id))
        throw new CircularDependencyException(`"${wrapper.name}"`);

      return instanceHost.donePromise.then((err?: unknown) => {
        if (err) throw err;
      });
    }

    const settlementSignal = this.applySettlementSignal(instanceHost, wrapper);
    const token = wrapper.token || wrapper.name;

    const { inject } = wrapper;
    const targetWrapper = collection.get(token);
    if (isUndefined(targetWrapper)) {
      throw new RuntimeException();
    }
    if (instanceHost.isResolved) {
      return settlementSignal.complete();
    }
    try {
      const t0 = this.getNowTimestamp();
      const callback = async (instances: unknown[]) => {
        const properties = await this.resolveProperties(
          wrapper,
          moduleRef,
          inject as InjectionToken[],
          contextId,
          wrapper,
          inquirer,
        );
        const instance = await this.instantiateClass(instances, wrapper, targetWrapper, contextId, inquirer);
        this.applyProperties(instance, properties);
        wrapper.initTime = this.getNowTimestamp() - t0;
        settlementSignal.complete();
      };
      await this.resolveConstructorParams<T>(
        wrapper,
        moduleRef,
        inject as InjectionToken[],
        callback,
        contextId,
        wrapper,
        inquirer,
      );
    } catch (err) {
      settlementSignal.error(err);
      throw err;
    }
  }

  public async loadInjectable<T = any>(
    wrapper: InstanceWrapper<T>,
    moduleRef: Module,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
  ) {
    const injectables = moduleRef.injectables;
    await this.loadInstance<T>(wrapper, injectables, moduleRef, contextId, inquirer);
  }

  public async loadProvider(
    wrapper: InstanceWrapper<Injectable>,
    moduleRef: Module,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
  ) {
    const providers = moduleRef.providers;
    await this.loadInstance<Injectable>(wrapper, providers, moduleRef, contextId, inquirer);
    await this.loadEnhancersPerContext(wrapper, contextId, wrapper);
  }

  public applySettlementSignal<T>(instancePerContext: InstancePerContext<T>, host: InstanceWrapper<T>) {
    const settlementSignal = new SettlementSignal();
    instancePerContext.donePromise = settlementSignal.asPromise();
    instancePerContext.isPending = true;
    host.settlementSignal = settlementSignal;

    return settlementSignal;
  }

  public async resolveConstructorParams<T>(
    wrapper: InstanceWrapper<T>,
    moduleRef: Module,
    inject: InjectorDependency[] | null,
    callback: (args: unknown[]) => void | Promise<void>,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
    parentInquirer?: InstanceWrapper,
  ) {
    let inquirerId = this.getInquirerId(inquirer);
    const metadata = wrapper.getCtorMetadata();

    if (metadata && contextId !== STATIC_CONTEXT) {
      const deps = await this.loadCtorMetadata(metadata, contextId, inquirer, parentInquirer);
      return callback(deps);
    }

    const isFactoryProvider = !isNull(inject);
    const [dependencies, optionalDependenciesIds] = isFactoryProvider
      ? this.getFactoryProviderDependencies(wrapper)
      : this.getClassDependencies(wrapper);

    let isResolved = true;
    const resolveParam = async (param: unknown, index: number) => {
      try {
        if (this.isInquirer(param, parentInquirer)) {
          return parentInquirer && parentInquirer.instance;
        }
        if (inquirer?.isTransient && parentInquirer) {
          inquirer = parentInquirer;
          inquirerId = this.getInquirerId(parentInquirer);
        }
        const paramWrapper = await this.resolveSingleParam<T>(
          wrapper,
          param,
          { index, dependencies },
          moduleRef,
          contextId,
          inquirer,
          index,
        );
        const instanceHost = paramWrapper.getInstanceByContextId(
          this.getContextId(contextId, paramWrapper),
          inquirerId,
        );
        if (!instanceHost.isResolved && !paramWrapper.forwardRef) {
          isResolved = false;
        }
        return instanceHost?.instance;
      } catch (err) {
        const isOptional = optionalDependenciesIds.includes(index);
        if (!isOptional) {
          throw err;
        }
        return undefined;
      }
    };
    const instances = await Promise.all(dependencies.map(resolveParam));
    isResolved && (await callback(instances));
  }

  public getClassDependencies<T>(wrapper: InstanceWrapper<T>): [InjectorDependency[], number[]] {
    const ctorRef = wrapper.metatype as Type<any>;
    return [this.reflectConstructorParams(ctorRef), this.reflectOptionalParams(ctorRef)];
  }

  public getFactoryProviderDependencies<T>(wrapper: InstanceWrapper<T>): [InjectorDependency[], number[]] {
    const optionalDependenciesIds: number[] = [];
    const isOptionalFactoryDep = (
      item: InjectionToken | OptionalFactoryDependency,
    ): item is OptionalFactoryDependency =>
      !isUndefined((item as OptionalFactoryDependency).token) &&
      !isUndefined((item as OptionalFactoryDependency).optional);

    const mapFactoryProviderInjectArray = (
      item: InjectionToken | OptionalFactoryDependency,
      index: number,
    ): InjectionToken => {
      if (typeof item !== "object") {
        return item;
      }
      if (isOptionalFactoryDep(item)) {
        if (item.optional) optionalDependenciesIds.push(index);

        return item?.token;
      }
      return item;
    };
    return [wrapper.inject?.map?.(mapFactoryProviderInjectArray) as InjectorDependency[], optionalDependenciesIds];
  }

  public reflectConstructorParams<T>(type: Type<T>): any[] {
    const paramtypes = [...(Reflect.getMetadata(PARAMTYPES_METADATA, type) || [])];
    const selfParams = this.reflectSelfParams<T>(type);

    selfParams.forEach(({ index, param }) => (paramtypes[index] = param));
    return paramtypes;
  }

  public reflectOptionalParams<T>(type: Type<T>): any[] {
    return Reflect.getMetadata(OPTIONAL_DEPS_METADATA, type) || [];
  }

  public reflectSelfParams<T>(type: Type<T>): any[] {
    return Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, type) || [];
  }

  public async resolveSingleParam<T>(
    wrapper: InstanceWrapper<T>,
    param: Type<any> | string | symbol | any,
    dependencyContext: InjectorDependencyContext,
    moduleRef: Module,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
    keyOrIndex?: symbol | string | number,
  ) {
    if (isUndefined(param)) {
      this.logger.log(
        "Venok encountered an undefined dependency. This may be due to a circular import or a missing dependency declaration.",
      );
      throw new UndefinedDependencyException(wrapper.name, dependencyContext, moduleRef);
    }
    const token = this.resolveParamToken(wrapper, param);
    return this.resolveComponentInstance<T>(
      moduleRef,
      token,
      dependencyContext,
      wrapper,
      contextId,
      inquirer,
      keyOrIndex,
    );
  }

  public resolveParamToken<T>(wrapper: InstanceWrapper<T>, param: Type<any> | string | symbol | any) {
    if (!param.forwardRef) {
      return param;
    }
    wrapper.forwardRef = true;
    return param.forwardRef();
  }

  public async resolveComponentInstance<T>(
    moduleRef: Module,
    token: InjectionToken,
    dependencyContext: InjectorDependencyContext,
    wrapper: InstanceWrapper<T>,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
    keyOrIndex?: symbol | string | number,
  ): Promise<InstanceWrapper> {
    this.printResolvingDependenciesLog(token, inquirer);
    this.printLookingForProviderLog(token, moduleRef);
    const providers = moduleRef.providers;
    const instanceWrapper = await this.lookupComponent(
      providers,
      moduleRef,
      { ...dependencyContext, name: token },
      wrapper,
      contextId,
      inquirer,
      keyOrIndex,
    );

    return this.resolveComponentHost(moduleRef, instanceWrapper, contextId, inquirer);
  }

  public async resolveComponentHost<T>(
    moduleRef: Module,
    instanceWrapper: InstanceWrapper<T | Promise<T>>,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
  ): Promise<InstanceWrapper> {
    const inquirerId = this.getInquirerId(inquirer);
    const instanceHost = instanceWrapper.getInstanceByContextId(
      this.getContextId(contextId, instanceWrapper),
      inquirerId,
    );
    if (!instanceHost.isResolved && !instanceWrapper.forwardRef) {
      inquirer?.settlementSignal?.insertRef(instanceWrapper.id);

      await this.loadProvider(instanceWrapper, instanceWrapper.host ?? moduleRef, contextId, inquirer);
    } else if (
      !instanceHost.isResolved &&
      instanceWrapper.forwardRef &&
      (contextId !== STATIC_CONTEXT || !!inquirerId)
    ) {
      /**
       * When circular dependency has been detected between
       * either request/transient providers, we have to asynchronously
       * resolve instance host for a specific contextId or inquirer, to ensure
       * that eventual lazily created instance will be merged with the prototype
       * instantiated beforehand.
       */
      instanceHost.donePromise &&
        instanceHost.donePromise.then(() => this.loadProvider(instanceWrapper, moduleRef, contextId, inquirer));
    }
    if (instanceWrapper.async) {
      const host = instanceWrapper.getInstanceByContextId(this.getContextId(contextId, instanceWrapper), inquirerId);
      host.instance = await host.instance;
      instanceWrapper.setInstanceByContextId(contextId, host, inquirerId);
    }
    return instanceWrapper;
  }

  public async lookupComponent<T = any>(
    providers: Map<Function | string | symbol, InstanceWrapper>,
    moduleRef: Module,
    dependencyContext: InjectorDependencyContext,
    wrapper: InstanceWrapper<T>,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
    keyOrIndex?: symbol | string | number,
  ): Promise<InstanceWrapper<T>> {
    const token = wrapper.token || wrapper.name;
    const { name } = dependencyContext;
    if (wrapper && token === name) {
      throw new UnknownDependenciesException(wrapper.name, dependencyContext, moduleRef, { id: wrapper.id });
    }
    if (name && providers.has(name)) {
      const instanceWrapper = providers.get(name) as InstanceWrapper;
      this.printFoundInModuleLog(name, moduleRef);
      this.addDependencyMetadata(keyOrIndex ?? "", wrapper, instanceWrapper);
      return instanceWrapper;
    }
    return this.lookupComponentInParentModules(dependencyContext, moduleRef, wrapper, contextId, inquirer, keyOrIndex);
  }

  public async lookupComponentInParentModules<T = any>(
    dependencyContext: InjectorDependencyContext,
    moduleRef: Module,
    wrapper: InstanceWrapper<T>,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
    keyOrIndex?: symbol | string | number,
  ) {
    const instanceWrapper = await this.lookupComponentInImports(
      moduleRef,
      dependencyContext.name as InjectionToken,
      wrapper,
      [],
      contextId,
      inquirer,
      keyOrIndex,
    );
    if (isNull(instanceWrapper)) {
      throw new UnknownDependenciesException(wrapper.name, dependencyContext, moduleRef, { id: wrapper.id });
    }
    return instanceWrapper;
  }

  public async lookupComponentInImports(
    moduleRef: Module,
    name: InjectionToken,
    wrapper: InstanceWrapper,
    moduleRegistry: any[] = [],
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
    keyOrIndex?: symbol | string | number,
    isTraversing?: boolean,
  ): Promise<any> {
    let instanceWrapperRef: InstanceWrapper | null = null;
    const imports = moduleRef.imports || new Set<Module>();
    const identity = (item: any) => item;

    let children = [...imports.values()].filter(identity);
    if (isTraversing) {
      const contextModuleExports = moduleRef.exports;
      children = children.filter((child) => contextModuleExports.has(child.metatype));
    }
    for (const relatedModule of children) {
      if (moduleRegistry.includes(relatedModule.id)) {
        continue;
      }
      this.printLookingForProviderLog(name, relatedModule);
      moduleRegistry.push(relatedModule.id);

      const { providers, exports } = relatedModule;
      if (!exports.has(name) || !providers.has(name)) {
        const instanceRef = await this.lookupComponentInImports(
          relatedModule,
          name,
          wrapper,
          moduleRegistry,
          contextId,
          inquirer,
          keyOrIndex,
          true,
        );
        // Maybe Error
        if (instanceRef && keyOrIndex) {
          this.addDependencyMetadata(keyOrIndex, wrapper, instanceRef);
          return instanceRef;
        }
        continue;
      }
      this.printFoundInModuleLog(name, relatedModule);
      instanceWrapperRef = providers.get(name) as InstanceWrapper;
      this.addDependencyMetadata(keyOrIndex ?? "", wrapper, instanceWrapperRef);

      const inquirerId = this.getInquirerId(inquirer);
      const instanceHost = instanceWrapperRef.getInstanceByContextId(
        this.getContextId(contextId, instanceWrapperRef),
        inquirerId,
      );
      if (!instanceHost.isResolved && !instanceWrapperRef.forwardRef) {
        wrapper.settlementSignal?.insertRef(instanceWrapperRef.id);

        await this.loadProvider(instanceWrapperRef, relatedModule, contextId, wrapper);
        break;
      }
    }
    return instanceWrapperRef;
  }

  public async resolveProperties<T>(
    wrapper: InstanceWrapper<T>,
    moduleRef: Module,
    inject?: InjectorDependency[],
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
    parentInquirer?: InstanceWrapper,
  ): Promise<PropertyDependency[]> {
    if (!isNull(inject)) {
      return [];
    }
    const metadata = wrapper.getPropertiesMetadata();
    if (metadata && contextId !== STATIC_CONTEXT) {
      return this.loadPropertiesMetadata(metadata, contextId, inquirer);
    }
    const properties = this.reflectProperties(wrapper.metatype as Type<any>);
    const instances = await Promise.all(
      properties.map(async (item: PropertyDependency) => {
        try {
          const dependencyContext = {
            key: item.key,
            name: item.name as Function | string | symbol,
          };
          if (this.isInquirer(item.name, parentInquirer)) {
            return parentInquirer && parentInquirer.instance;
          }
          const paramWrapper = await this.resolveSingleParam<T>(
            wrapper,
            item.name,
            dependencyContext,
            moduleRef,
            contextId,
            inquirer,
            item.key,
          );
          if (!paramWrapper) {
            return undefined;
          }
          const inquirerId = this.getInquirerId(inquirer);
          const instanceHost = paramWrapper.getInstanceByContextId(
            this.getContextId(contextId, paramWrapper),
            inquirerId,
          );
          return instanceHost.instance;
        } catch (err) {
          if (!item.isOptional) {
            throw err;
          }
          return undefined;
        }
      }),
    );
    return properties.map((item: PropertyDependency, index: number) => ({
      ...item,
      instance: instances[index],
    }));
  }

  public reflectProperties<T>(type: Type<T>): PropertyDependency[] {
    const properties = Reflect.getMetadata(PROPERTY_DEPS_METADATA, type) || [];
    const optionalKeys: string[] = Reflect.getMetadata(OPTIONAL_PROPERTY_DEPS_METADATA, type) || [];

    return properties.map((item: any) => ({
      ...item,
      name: item.type,
      isOptional: optionalKeys.includes(item.key),
    }));
  }

  public applyProperties<T = any>(instance: T, properties: PropertyDependency[]): void {
    if (!isObject(instance)) {
      return undefined;
    }
    properties
      .filter((item) => !isNull(item.instance))
      .forEach((item) => {
        // Maybe Error
        // @ts-ignore
        instance[item.key] = item.instance;
      });
  }

  public async instantiateClass<T = any>(
    instances: any[],
    wrapper: InstanceWrapper,
    targetMetatype: InstanceWrapper,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
  ): Promise<T> {
    const { metatype, inject } = wrapper;
    const inquirerId = this.getInquirerId(inquirer);
    const instanceHost = targetMetatype.getInstanceByContextId(
      this.getContextId(contextId, targetMetatype),
      inquirerId,
    );
    const isInContext =
      wrapper.isStatic(contextId, inquirer) ||
      wrapper.isInRequestScope(contextId, inquirer) ||
      wrapper.isLazyTransient(contextId, inquirer) ||
      wrapper.isExplicitlyRequested(contextId, inquirer);

    if (this.options?.preview && !wrapper.host?.initOnPreview) {
      instanceHost.isResolved = true;
      return instanceHost.instance;
    }

    if (isNull(inject) && isInContext) {
      instanceHost.instance = wrapper.forwardRef
        ? Object.assign(instanceHost.instance, new (metatype as Type<any>)(...instances))
        : new (metatype as Type<any>)(...instances);
    } else if (isInContext) {
      const factoryReturnValue = (targetMetatype.metatype as any as Function)(...instances);
      instanceHost.instance = await factoryReturnValue;
    }
    instanceHost.isResolved = true;
    return instanceHost.instance;
  }

  public async loadPerContext<T = any>(
    instance: T,
    moduleRef: Module,
    collection: Map<InjectionToken, InstanceWrapper>,
    ctx: ContextId,
    wrapper?: InstanceWrapper,
  ): Promise<T> {
    if (!wrapper) {
      const injectionToken = instance!.constructor;
      wrapper = collection.get(injectionToken) as InstanceWrapper;
    }
    await this.loadInstance(wrapper, collection, moduleRef, ctx, wrapper);
    await this.loadEnhancersPerContext(wrapper, ctx, wrapper);

    const host = wrapper.getInstanceByContextId(this.getContextId(ctx, wrapper), wrapper.id);
    return host && (host.instance as T);
  }

  public async loadEnhancersPerContext(wrapper: InstanceWrapper, ctx: ContextId, inquirer?: InstanceWrapper) {
    const enhancers = wrapper.getEnhancersMetadata() || [];
    const loadEnhancer = (item: InstanceWrapper) => {
      const hostModule = item.host as Module;
      return this.loadInstance(item, hostModule.injectables, hostModule, ctx, inquirer);
    };
    await Promise.all(enhancers.map(loadEnhancer));
  }

  public async loadCtorMetadata(
    metadata: InstanceWrapper<any>[],
    contextId: ContextId,
    inquirer?: InstanceWrapper,
    parentInquirer?: InstanceWrapper,
  ): Promise<any[]> {
    const hosts: Array<InstanceWrapper<any> | undefined> = await Promise.all(
      metadata.map(async (item) => this.resolveScopedComponentHost(item, contextId, inquirer, parentInquirer)),
    );
    const inquirerId = this.getInquirerId(inquirer);
    return hosts.map((item) => item?.getInstanceByContextId(this.getContextId(contextId, item), inquirerId).instance);
  }

  public async loadPropertiesMetadata(
    metadata: PropertyMetadata[],
    contextId: ContextId,
    inquirer?: InstanceWrapper,
  ): Promise<PropertyDependency[]> {
    const dependenciesHosts = await Promise.all(
      metadata.map(async ({ wrapper: item, key }) => ({
        key,
        host: await this.resolveComponentHost(
          (item as WithRequired<InstanceWrapper, "host">).host,
          item,
          contextId,
          inquirer,
        ),
      })),
    );
    const inquirerId = this.getInquirerId(inquirer);
    return dependenciesHosts.map(({ key, host }) => ({
      key,
      name: key,
      instance: host.getInstanceByContextId(this.getContextId(contextId, host), inquirerId).instance,
    }));
  }

  private getInquirerId(inquirer: InstanceWrapper | undefined): string | undefined {
    return inquirer && inquirer.id;
  }

  private resolveScopedComponentHost(
    item: InstanceWrapper,
    contextId: ContextId,
    inquirer?: InstanceWrapper,
    parentInquirer?: InstanceWrapper,
  ) {
    return this.isInquirerRequest(item, parentInquirer)
      ? parentInquirer
      : this.resolveComponentHost((item as WithRequired<InstanceWrapper, "host">).host, item, contextId, inquirer);
  }

  private isInquirerRequest(item: InstanceWrapper, parentInquirer: InstanceWrapper | undefined) {
    return item.isTransient && item.name === INQUIRER && parentInquirer;
  }

  private isInquirer(param: unknown, parentInquirer: InstanceWrapper | undefined) {
    return param === INQUIRER && parentInquirer;
  }

  protected addDependencyMetadata(
    keyOrIndex: symbol | string | number,
    hostWrapper: InstanceWrapper,
    instanceWrapper: InstanceWrapper,
  ) {
    if (isSymbol(keyOrIndex) || isString(keyOrIndex)) {
      hostWrapper.addPropertiesMetadata(keyOrIndex, instanceWrapper);
    } else {
      hostWrapper.addCtorMetadata(keyOrIndex, instanceWrapper);
    }
  }

  private getTokenName(token: InjectionToken): string {
    return isFunction(token) ? (token as Function).name : token.toString();
  }

  private printResolvingDependenciesLog(token: InjectionToken, inquirer?: InstanceWrapper): void {
    if (!this.isDebugMode()) {
      return;
    }
    const tokenName = this.getTokenName(token);
    const dependentName = (inquirer?.name && inquirer.name.toString?.()) ?? "unknown";
    const isAlias = dependentName === tokenName;

    const messageToPrint = `Resolving dependency ${colors.cyanBright(tokenName)}${colors.green(
      " in the ",
    )}${colors.yellow(dependentName)}${colors.green(` provider ${isAlias ? "(alias)" : ""}`)}`;

    this.logger.log(messageToPrint);
  }

  private printLookingForProviderLog(token: InjectionToken, moduleRef: Module): void {
    if (!this.isDebugMode()) {
      return;
    }
    const tokenName = this.getTokenName(token);
    const moduleRefName = moduleRef?.metatype?.name ?? "unknown";
    this.logger.log(
      `Looking for ${colors.cyanBright(tokenName)}${colors.green(" in ")}${colors.magentaBright(moduleRefName)}`,
    );
  }

  private printFoundInModuleLog(token: InjectionToken, moduleRef: Module): void {
    if (!this.isDebugMode()) {
      return;
    }
    const tokenName = this.getTokenName(token);
    const moduleRefName = moduleRef?.metatype?.name ?? "unknown";
    this.logger.log(
      `Found ${colors.cyanBright(tokenName)}${colors.green(" in ")}${colors.magentaBright(moduleRefName)}`,
    );
  }

  private isDebugMode(): boolean {
    return !!process.env.VENOK_DEBUG;
  }

  private getContextId(contextId: ContextId, instanceWrapper: InstanceWrapper): ContextId {
    return contextId.getParent
      ? contextId.getParent({
          token: instanceWrapper.token,
          isTreeDurable: instanceWrapper.isDependencyTreeDurable(),
        })
      : contextId;
  }

  private getNowTimestamp() {
    return performance.now();
  }
}
