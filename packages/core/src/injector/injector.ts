import type {
  ContextId,
  InjectableToken,
  InjectionToken,
  InjectorDependency,
  InjectorDependencyContext,
  InstancePerContext,
  LoggerService,
  OptionalFactoryDependency,
  PropertyDependency,
  Type,
  WithRequired
} from "~/interfaces/index.js";
import type { PropertyMetadata } from "~/injector/instance/wrapper.js";
import { InstanceWrapper } from "~/injector/instance/wrapper.js";
import { Logger } from "~/services/logger.service.js";

import { SettlementSignal } from "~/injector/settlement-signal.js";
import { STATIC_CONTEXT } from "~/injector/constants.js";
import { Barrier } from "~/injector/helpers/barrier.js";
import { Module } from "~/injector/module/module.js";

import { CircularDependencyException } from "~/errors/exceptions/circular-dependency.exception.js";
import { UndefinedDependencyException } from "~/errors/exceptions/undefined-dependency.exception.js";
import { UnknownDependenciesException } from "~/errors/exceptions/unknown-dependencies.exception.js";
import { RuntimeException } from "~/errors/exceptions/runtime.exception.js";

import { colors } from "~/helpers/color.helper.js";
import { isFunction, isNull, isObject, isString, isSymbol, isUndefined } from "~/helpers/shared.helper.js";

import {
  INQUIRER,
  OPTIONAL_DEPS_METADATA,
  OPTIONAL_PROPERTY_DEPS_METADATA,
  PARAMTYPES_METADATA,
  PROPERTY_DEPS_METADATA,
  SELF_DECLARED_DEPS_METADATA
} from "~/constants.js";
import { Reflector } from "~/services/reflector.service.js";
import { ModulesContainer } from "~/injector/module/container.js";
import { VenokContextCreator } from "~/context/context.js";
import { ConsoleLogger } from "~/services/console.service.js";
import { VenokContainer } from "~/injector/container.js";
import { LazyModuleLoader } from "~/injector/module/lazy/loader.js";
import { SerializedGraph } from "~/inspector/serialized-graph.js";

export class Injector {
  private logger: LoggerService = new Logger("InjectorLogger");

  constructor(private readonly options?: { preview: boolean }) {}

  public loadPrototype<T>(
    { token }: InstanceWrapper<T>,
    collection: Map<InjectionToken, InstanceWrapper<T>>,
    contextId = STATIC_CONTEXT
  ) {
    if (!collection) {
      return;
    }
    const target = collection.get(token) as InstanceWrapper;
    const instance = target.createPrototype(contextId);
    if (instance) {
      const wrapper = new InstanceWrapper<T>({
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
    inquirer?: InstanceWrapper
  ) {
    const inquirerId = this.getInquirerId(inquirer);
    const instanceHost = wrapper.getInstanceByContextId(this.getContextId(contextId, wrapper), inquirerId);

    // Maybe Error
    if (instanceHost.isPending) {
      const settlementSignal = wrapper.settlementSignal;
      if (inquirer && settlementSignal?.isCycle(inquirer.id))
        throw new CircularDependencyException(`"${wrapper.name}"`);

      return instanceHost.donePromise!.then((err?: unknown) => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
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
          inquirer
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
        inquirer
      );
    } catch (err) {
      wrapper.removeInstanceByContextId(this.getContextId(contextId, wrapper), inquirerId);

      settlementSignal.error(err);
      throw err;
    }
  }

  public async loadInjectable<T = any>(
    wrapper: InstanceWrapper<T>,
    moduleRef: Module,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper
  ) {
    const injectables = moduleRef.injectables;
    await this.loadInstance<T>(wrapper, injectables, moduleRef, contextId, inquirer);
  }

  public async loadProvider(
    wrapper: InstanceWrapper<InjectableToken>,
    moduleRef: Module,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper
  ) {
    const providers = moduleRef.providers;
    await this.loadInstance<InjectableToken>(wrapper, providers, moduleRef, contextId, inquirer);
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
    parentInquirer?: InstanceWrapper
  ) {
    const inquirerId = this.getInquirerId(inquirer);
    const metadata = wrapper.getCtorMetadata();

    if (metadata && contextId !== STATIC_CONTEXT) {
      const deps = await this.loadCtorMetadata(metadata, contextId, inquirer, parentInquirer);
      return callback(deps);
    }

    const isFactoryProvider = !isNull(inject);
    const [dependencies, optionalDependenciesIds] = isFactoryProvider
      ? this.getFactoryProviderDependencies(wrapper)
      : this.getClassDependencies(wrapper);

    const paramBarrier = new Barrier(dependencies.length);

    let isResolved = true;
    const resolveParam = async (param: unknown, index: number) => {
      try {
        if (this.isInquirer(param, parentInquirer)) {
          /*
           * Signal the barrier to make sure other dependencies do not get stuck waiting forever.
           */

          paramBarrier.signal();
          return parentInquirer && parentInquirer.instance;
        }
        if (inquirer?.isTransient && parentInquirer) {
          /*
           * When `inquirer` is transient too, inherit the parent inquirer
           * This is required to ensure that transient providers are only resolved
           * when requested
           */

          inquirer.attachRootInquirer(parentInquirer);
        }
        const paramWrapper = await this.resolveSingleParam<T>(
          wrapper,
          // @ts-expect-error Mismatch types
          param,
          { index, dependencies },
          moduleRef,
          contextId,
          inquirer,
          index
        );

        /*
         * Ensure that all instance wrappers are resolved at this point before we continue.
         * Otherwise the staticity of `wrapper`'s dependency tree may be evaluated incorrectly
         * and result in undefined / null injection.
         */
        await paramBarrier.signalAndWait();

        const paramWrapperWithInstance = await this.resolveComponentHost(moduleRef, paramWrapper, contextId, inquirer);

        const instanceHost = paramWrapperWithInstance.getInstanceByContextId(
          this.getContextId(contextId, paramWrapperWithInstance),
          inquirerId
        );
        if (!instanceHost.isResolved && !paramWrapperWithInstance.forwardRef) {
          isResolved = false;
        }
        return instanceHost?.instance;
      } catch (err) {
        /*
         * Signal the barrier to make sure other dependencies do not get stuck waiting forever. We
         * do not care if this occurs after `Barrier.signalAndWait()` is called in the `try` block
         * because the barrier will always have been resolved by then.
         */
        paramBarrier.signal();

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
    const ctorRef = wrapper.metatype as Type;
    return [this.reflectConstructorParams(ctorRef), this.reflectOptionalParams(ctorRef)];
  }

  public getFactoryProviderDependencies<T>(wrapper: InstanceWrapper<T>): [InjectorDependency[], number[]] {
    const optionalDependenciesIds: number[] = [];

    /**
     * Same as the internal utility function `isOptionalFactoryDependency` from `@venokjs/integration`.
     * We are duplicating it here because that one is not supposed to be exported.
     */
    function isOptionalFactoryDependency(
      value: InjectionToken | OptionalFactoryDependency
    ): value is OptionalFactoryDependency {
      return (
        !isUndefined((value as OptionalFactoryDependency).token) &&
        !isUndefined((value as OptionalFactoryDependency).optional) &&
        !(value as any).prototype
      );
    }

    const mapFactoryProviderInjectArray = (
      item: InjectionToken | OptionalFactoryDependency,
      index: number
    ): InjectionToken => {
      if (typeof item !== "object") {
        return item;
      }
      if (isOptionalFactoryDependency(item)) {
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
    param: Type | string | symbol,
    dependencyContext: InjectorDependencyContext,
    moduleRef: Module,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
    keyOrIndex?: symbol | string | number
  ) {
    if (isUndefined(param)) {
      this.logger.log(
        "Venok encountered an undefined dependency. This may be due to a circular import or a missing dependency declaration."
      );
      throw new UndefinedDependencyException(wrapper.name, dependencyContext, moduleRef);
    }
    let token = this.resolveParamToken(wrapper, param);

    /* This hack for nestjs compatibility */
    switch ((token as any).name) {
      case "Reflector": token = Reflector; break;
      case "ModulesContainer": token = ModulesContainer; break;
      case "ExternalContextCreator": token = VenokContextCreator; break;
      case "NestContainer": token = VenokContainer; break;
      case "LazyModuleLoader": token = LazyModuleLoader; break;
      case "SerializedGraph": token = SerializedGraph; break;
      case "Logger": token = Logger; break;
      case "ConsoleLogger": token = ConsoleLogger; break;
    }

    return this.resolveComponentWrapper<T>(
      moduleRef,
      token,
      dependencyContext,
      wrapper,
      contextId,
      inquirer,
      keyOrIndex
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  public resolveParamToken<T>(wrapper: InstanceWrapper<T>, param: Type | string | symbol | any): InjectionToken {
    if (!param.forwardRef) {
      return param;
    }
    wrapper.forwardRef = true;
    return param.forwardRef();
  }

  public async resolveComponentWrapper<T>(
    moduleRef: Module,
    token: InjectionToken,
    dependencyContext: InjectorDependencyContext,
    wrapper: InstanceWrapper<T>,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
    keyOrIndex?: symbol | string | number
  ): Promise<InstanceWrapper> {
    this.printResolvingDependenciesLog(token, inquirer);
    this.printLookingForProviderLog(token, moduleRef);
    const providers = moduleRef.providers;
    return this.lookupComponent(
      providers,
      moduleRef,
      { ...dependencyContext, name: token },
      wrapper,
      contextId,
      inquirer,
      keyOrIndex
    );
  }

  public async resolveComponentHost<T>(
    moduleRef: Module,
    instanceWrapper: InstanceWrapper<T | Promise<T>>,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper
  ): Promise<InstanceWrapper> {
    const inquirerId = this.getInquirerId(inquirer);
    const instanceHost = instanceWrapper.getInstanceByContextId(
      this.getContextId(contextId, instanceWrapper),
      inquirerId
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
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
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
    keyOrIndex?: symbol | string | number
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
    keyOrIndex?: symbol | string | number
  ) {
    const instanceWrapper = await this.lookupComponentInImports(
      moduleRef,
      dependencyContext.name as InjectionToken,
      wrapper,
      [],
      contextId,
      inquirer,
      keyOrIndex
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
    isTraversing?: boolean
  ): Promise<InstanceWrapper | null> {
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
          true
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
        inquirerId
      );
      if (!instanceHost.isResolved && !instanceWrapperRef.forwardRef) {
        /*
         * Provider will be loaded shortly in resolveComponentHost() once we pass the current
         * Barrier. We cannot load it here because doing so could incorrectly evaluate the
         * staticity of the dependency tree and lead to undefined / null injection.
         */
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
    parentInquirer?: InstanceWrapper
  ): Promise<PropertyDependency[]> {
    if (!isNull(inject)) {
      return [];
    }
    const metadata = wrapper.getPropertiesMetadata();
    if (metadata && contextId !== STATIC_CONTEXT) {
      return this.loadPropertiesMetadata(metadata, contextId, inquirer);
    }
    const properties = this.reflectProperties(wrapper.metatype as Type);
    const propertyBarrier = new Barrier(properties.length);
    const instances = await Promise.all(
      properties.map(async (item: PropertyDependency) => {
        try {
          const dependencyContext = {
            key: item.key,
            name: item.name as Function | string | symbol,
          };
          if (this.isInquirer(item.name, parentInquirer)) {
            /*
             * Signal the barrier to make sure other dependencies do not get stuck waiting forever.
             */
            propertyBarrier.signal();
            return parentInquirer && parentInquirer.instance;
          }
          const paramWrapper = await this.resolveSingleParam<T>(
            wrapper,
            item.name as string,
            dependencyContext,
            moduleRef,
            contextId,
            inquirer,
            item.key
          );

          /*
           * Ensure that all instance wrappers are resolved at this point before we continue.
           * Otherwise the staticity of `wrapper`'s dependency tree may be evaluated incorrectly
           * and result in undefined / null injection.
           */
          await propertyBarrier.signalAndWait();

          const paramWrapperWithInstance = await this.resolveComponentHost(
            moduleRef,
            paramWrapper,
            contextId,
            inquirer
          );

          if (!paramWrapperWithInstance) return undefined;

          const inquirerId = this.getInquirerId(inquirer);
          const instanceHost = paramWrapperWithInstance.getInstanceByContextId(
            this.getContextId(contextId, paramWrapperWithInstance),
            inquirerId
          );
          return instanceHost.instance;
        } catch (err) {
          /*
           * Signal the barrier to make sure other dependencies do not get stuck waiting forever. We
           * do not care if this occurs after `Barrier.signalAndWait()` is called in the `try` block
           * because the barrier will always have been resolved by then.
           */
          propertyBarrier.signal();

          if (!item.isOptional) {
            throw err;
          }
          return undefined;
        }
      })
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
        // @ts-expect-error Mismatch types
        instance[item.key] = item.instance;
      });
  }

  public async instantiateClass<T = any>(
    instances: any[],
    wrapper: InstanceWrapper,
    targetMetatype: InstanceWrapper,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper
  ): Promise<T> {
    const { metatype, inject } = wrapper;
    const inquirerId = this.getInquirerId(inquirer);
    const instanceHost = targetMetatype.getInstanceByContextId(
      this.getContextId(contextId, targetMetatype),
      inquirerId
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        ? Object.assign(instanceHost.instance, new (metatype as Type)(...instances))
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        : new (metatype as Type)(...instances);
      instanceHost.isConstructorCalled = true;
    } else if (isInContext) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const factoryReturnValue = (targetMetatype.metatype as any as Function)(...instances);
      instanceHost.instance = await factoryReturnValue;
      instanceHost.isConstructorCalled = true;
    }
    instanceHost.isResolved = true;
    return instanceHost.instance;
  }

  public async loadPerContext<T = any>(
    instance: T,
    moduleRef: Module,
    collection: Map<InjectionToken, InstanceWrapper>,
    ctx: ContextId,
    wrapper?: InstanceWrapper
  ): Promise<T> {
    if (!wrapper) {
      // @ts-expect-error Mismatch types
      const injectionToken = instance.constructor;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
    parentInquirer?: InstanceWrapper
  ): Promise<any[]> {
    const hosts: Array<InstanceWrapper<any> | undefined> = await Promise.all(
      metadata.map(async (item) => this.resolveScopedComponentHost(item, contextId, inquirer, parentInquirer))
    );
    const inquirerId = this.getInquirerId(inquirer);
    return hosts.map((item) => item?.getInstanceByContextId(this.getContextId(contextId, item), inquirerId).instance);
  }

  public async loadPropertiesMetadata(
    metadata: PropertyMetadata[],
    contextId: ContextId,
    inquirer?: InstanceWrapper
  ): Promise<PropertyDependency[]> {
    const dependenciesHosts = await Promise.all(
      metadata.map(async ({ wrapper: item, key }) => ({
        key,
        host: await this.resolveComponentHost(
          (item as WithRequired<InstanceWrapper, "host">).host,
          item,
          contextId,
          inquirer
        ),
      }))
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
    parentInquirer?: InstanceWrapper
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
    instanceWrapper: InstanceWrapper
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
      " in the "
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
      `Looking for ${colors.cyanBright(tokenName)}${colors.green(" in ")}${colors.magentaBright(moduleRefName)}`
    );
  }

  private printFoundInModuleLog(token: InjectionToken, moduleRef: Module): void {
    if (!this.isDebugMode()) {
      return;
    }
    const tokenName = this.getTokenName(token);
    const moduleRefName = moduleRef?.metatype?.name ?? "unknown";
    this.logger.log(
      `Found ${colors.cyanBright(tokenName)}${colors.green(" in ")}${colors.magentaBright(moduleRefName)}`
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
