import type { FactoryProvider, InjectionToken, Provider } from "@venok/core/interfaces/modules/index.js";
import { Module } from "@venok/core/injector/module/module.js";
import type { EnhancerSubtype } from "@venok/core/constants.js";
import { Scope, type Type } from "@venok/core/interfaces/index.js";
import { SettlementSignal } from "@venok/core/injector/settlement-signal.js";
import { STATIC_CONTEXT } from "@venok/core/injector/constants.js";
import { isNull, isString, isUndefined } from "@venok/core/helpers/shared.helper.js";
import { UuidFactory } from "@venok/core/helpers/uuid.helper.js";
import { randomStringGenerator } from "@venok/core/helpers/random-string-generator.helper.js";
import { colors } from "@venok/core/helpers/color.helper.js";
import { isClassProvider, isFactoryProvider, isValueProvider } from "@venok/core/injector/helpers/classifier.helper.js";
import { Logger, type LoggerService } from "@venok/core/services/logger.service.js";

export const INSTANCE_METADATA_SYMBOL = Symbol.for("instance_metadata:cache");
export const INSTANCE_ID_SYMBOL = Symbol.for("instance_metadata:id");

export interface HostComponentInfo {
  /**
   * Injection token (or class reference)
   */
  token: InjectionToken;
  /**
   * Flag that indicates whether DI subtree is durable
   */
  isTreeDurable: boolean;
}

export interface ContextId {
  readonly id: number;
  payload?: unknown;
  getParent?(info: HostComponentInfo): ContextId;
}

export interface InstancePerContext<T> {
  instance: T | undefined;
  isResolved?: boolean;
  isPending?: boolean;
  donePromise?: Promise<unknown>;
  [INSTANCE_ID_SYMBOL]?: string;
}

export interface PropertyMetadata {
  key: symbol | string;
  wrapper: InstanceWrapper;
}

interface InstanceMetadataStore {
  dependencies?: InstanceWrapper[];
  properties?: PropertyMetadata[];
  enhancers?: InstanceWrapper[];
}

export class InstanceWrapper<T = any> {
  public readonly isAlias: boolean = false;
  public scope?: Scope = Scope.DEFAULT;

  public readonly name!: string;
  public readonly token!: InjectionToken;
  public readonly async?: boolean;
  public readonly host?: Module;
  public readonly subtype?: EnhancerSubtype;
  public metatype?: Type<T> | Function | null;
  public inject?: FactoryProvider["inject"] | null;
  public forwardRef?: boolean;
  public durable?: boolean;
  public initTime?: number;
  public settlementSignal?: SettlementSignal;

  private static logger: LoggerService = new Logger(InstanceWrapper.name);

  private readonly values = new WeakMap<ContextId, InstancePerContext<T>>();
  private readonly [INSTANCE_METADATA_SYMBOL]: InstanceMetadataStore = {};
  private readonly [INSTANCE_ID_SYMBOL]: string;
  private transientMap: Map<string, WeakMap<ContextId, InstancePerContext<T>>> = new Map();
  private isTreeStatic: boolean | undefined;
  private isTreeDurable: boolean | undefined;

  constructor(metadata: Partial<InstanceWrapper<T>> & Partial<InstancePerContext<T>> = {}) {
    this.initialize(metadata);
    this[INSTANCE_ID_SYMBOL] = metadata[INSTANCE_ID_SYMBOL] ?? this.generateUuid();
  }

  get id(): string {
    return this[INSTANCE_ID_SYMBOL];
  }

  set instance(value: T) {
    this.values.set(STATIC_CONTEXT, { instance: value });
  }

  get instance(): T | undefined {
    const instancePerContext = this.getInstanceByContextId(STATIC_CONTEXT);
    return instancePerContext.instance;
  }

  get isNotMetatype(): boolean {
    return !this.metatype || this.isFactory;
  }

  get isFactory(): boolean {
    return !!(this.metatype && !isNull(this.inject));
  }

  get isTransient(): boolean {
    return this.scope === Scope.TRANSIENT;
  }

  public getInstanceByContextId(contextId: ContextId, inquirerId?: string): InstancePerContext<T> {
    if (this.scope === Scope.TRANSIENT && inquirerId) {
      return this.getInstanceByInquirerId(contextId, inquirerId);
    }
    const instancePerContext = this.values.get(contextId);
    return instancePerContext ? instancePerContext : this.cloneStaticInstance(contextId);
  }

  public getInstanceByInquirerId(contextId: ContextId, inquirerId: string): InstancePerContext<T> {
    let collectionPerContext = this.transientMap.get(inquirerId);
    if (!collectionPerContext) {
      collectionPerContext = new WeakMap();
      this.transientMap.set(inquirerId, collectionPerContext);
    }
    const instancePerContext = collectionPerContext.get(contextId);
    return instancePerContext ? instancePerContext : this.cloneTransientInstance(contextId, inquirerId);
  }

  public setInstanceByContextId(contextId: ContextId, value: InstancePerContext<T>, inquirerId?: string) {
    if (this.scope === Scope.TRANSIENT && inquirerId) {
      return this.setInstanceByInquirerId(contextId, inquirerId, value);
    }
    this.values.set(contextId, value);
  }

  public setInstanceByInquirerId(contextId: ContextId, inquirerId: string, value: InstancePerContext<T>) {
    let collection = this.transientMap.get(inquirerId);
    if (!collection) {
      collection = new WeakMap();
      this.transientMap.set(inquirerId, collection);
    }
    collection.set(contextId, value);
  }

  public removeInstanceByContextId(contextId: ContextId, inquirerId?: string) {
    if (this.scope === Scope.TRANSIENT && inquirerId) {
      return this.removeInstanceByInquirerId(contextId, inquirerId);
    }
    this.values.delete(contextId);
  }

  public removeInstanceByInquirerId(contextId: ContextId, inquirerId: string) {
    const collection = this.transientMap.get(inquirerId);
    if (!collection) return;

    collection.delete(contextId);
  }

  public addCtorMetadata(index: number, wrapper: InstanceWrapper) {
    if (!this[INSTANCE_METADATA_SYMBOL].dependencies) {
      this[INSTANCE_METADATA_SYMBOL].dependencies = [];
    }
    this[INSTANCE_METADATA_SYMBOL].dependencies[index] = wrapper;
  }

  public getCtorMetadata(): InstanceWrapper[] {
    return this[INSTANCE_METADATA_SYMBOL].dependencies ?? [];
  }

  public addPropertiesMetadata(key: symbol | string, wrapper: InstanceWrapper) {
    if (!this[INSTANCE_METADATA_SYMBOL].properties) {
      this[INSTANCE_METADATA_SYMBOL].properties = [];
    }
    this[INSTANCE_METADATA_SYMBOL].properties.push({
      key,
      wrapper,
    });
  }

  public getPropertiesMetadata(): PropertyMetadata[] {
    return this[INSTANCE_METADATA_SYMBOL].properties ?? [];
  }

  public addEnhancerMetadata(wrapper: InstanceWrapper) {
    if (!this[INSTANCE_METADATA_SYMBOL].enhancers) {
      this[INSTANCE_METADATA_SYMBOL].enhancers = [];
    }
    this[INSTANCE_METADATA_SYMBOL].enhancers.push(wrapper);
  }

  public getEnhancersMetadata(): InstanceWrapper[] {
    return this[INSTANCE_METADATA_SYMBOL].enhancers ?? [];
  }

  public isDependencyTreeDurable(lookupRegistry: string[] = []): boolean {
    if (!isUndefined(this.isTreeDurable)) {
      return this.isTreeDurable;
    }
    if (this.scope === Scope.REQUEST) {
      this.isTreeDurable = this.durable === undefined ? false : this.durable;
      if (this.isTreeDurable) {
        this.printIntrospectedAsDurable();
      }
      return this.isTreeDurable;
    }
    const isStatic = this.isDependencyTreeStatic();
    if (isStatic) return false;

    const isTreeNonDurable = this.introspectDepsAttribute(
      (collection, registry) =>
        collection.some(
          (item: InstanceWrapper) => !item.isDependencyTreeStatic() && !item.isDependencyTreeDurable(registry),
        ),
      lookupRegistry,
    );
    this.isTreeDurable = !isTreeNonDurable;
    if (this.isTreeDurable) this.printIntrospectedAsDurable();

    return this.isTreeDurable;
  }

  public introspectDepsAttribute(
    callback: (collection: InstanceWrapper[], lookupRegistry: string[]) => boolean,
    lookupRegistry: string[] = [],
  ): boolean {
    if (lookupRegistry.includes(this[INSTANCE_ID_SYMBOL])) {
      return false;
    }
    lookupRegistry = lookupRegistry.concat(this[INSTANCE_ID_SYMBOL]);

    const { dependencies, properties, enhancers } = this[INSTANCE_METADATA_SYMBOL];

    let introspectionResult = dependencies ? callback(dependencies, lookupRegistry) : false;

    if (introspectionResult || !(properties || enhancers)) return introspectionResult;

    introspectionResult = properties
      ? callback(
          properties.map((item) => item.wrapper),
          lookupRegistry,
        )
      : false;
    if (introspectionResult || !enhancers) return introspectionResult;

    return enhancers ? callback(enhancers, lookupRegistry) : false;
  }

  public isDependencyTreeStatic(lookupRegistry: string[] = []): boolean {
    if (!isUndefined(this.isTreeStatic)) return this.isTreeStatic;

    if (this.scope === Scope.REQUEST) {
      this.isTreeStatic = false;
      this.printIntrospectedAsRequestScoped();
      return this.isTreeStatic;
    }
    this.isTreeStatic = !this.introspectDepsAttribute(
      (collection, registry) => collection.some((item: InstanceWrapper) => !item.isDependencyTreeStatic(registry)),
      lookupRegistry,
    );
    if (!this.isTreeStatic) this.printIntrospectedAsRequestScoped();

    return this.isTreeStatic;
  }

  public cloneStaticInstance(contextId: ContextId): InstancePerContext<T> {
    const staticInstance = this.getInstanceByContextId(STATIC_CONTEXT);
    if (this.isDependencyTreeStatic()) return staticInstance;

    const instancePerContext: InstancePerContext<T> = {
      ...staticInstance,
      instance: undefined,
      isResolved: false,
      isPending: false,
    };
    if (this.isNewable()) instancePerContext.instance = Object.create(this.metatype!.prototype);

    this.setInstanceByContextId(contextId, instancePerContext);
    return instancePerContext;
  }

  public cloneTransientInstance(contextId: ContextId, inquirerId: string): InstancePerContext<T> {
    const staticInstance = this.getInstanceByContextId(STATIC_CONTEXT);
    const instancePerContext: InstancePerContext<T> = {
      ...staticInstance,
      instance: undefined,
      isResolved: false,
      isPending: false,
    };
    if (this.isNewable()) {
      instancePerContext.instance = Object.create(this.metatype!.prototype);
    }
    this.setInstanceByInquirerId(contextId, inquirerId, instancePerContext);
    return instancePerContext;
  }

  public createPrototype(contextId: ContextId) {
    const host = this.getInstanceByContextId(contextId);
    if (!this.isNewable() || host.isResolved) return;

    return Object.create(this.metatype!.prototype);
  }

  public isInRequestScope(contextId: ContextId, inquirer?: InstanceWrapper | undefined): boolean {
    const isDependencyTreeStatic = this.isDependencyTreeStatic();

    return (
      !isDependencyTreeStatic && contextId !== STATIC_CONTEXT && (!this.isTransient || (this.isTransient && !!inquirer))
    );
  }

  public isLazyTransient(contextId: ContextId, inquirer: InstanceWrapper | undefined): boolean {
    const isInquirerRequestScoped = inquirer && !inquirer.isDependencyTreeStatic();

    return (
      this.isDependencyTreeStatic() && contextId !== STATIC_CONTEXT && this.isTransient && !!isInquirerRequestScoped
    );
  }

  public isExplicitlyRequested(contextId: ContextId, inquirer?: InstanceWrapper): boolean {
    const isSelfRequested = inquirer === this;
    return (
      this.isDependencyTreeStatic() &&
      contextId !== STATIC_CONTEXT &&
      !!(isSelfRequested || (inquirer && inquirer.scope === Scope.TRANSIENT))
    );
  }

  public isStatic(contextId: ContextId, inquirer: InstanceWrapper | undefined): boolean {
    const isInquirerRequestScoped = inquirer && !inquirer.isDependencyTreeStatic();
    const isStaticTransient = this.isTransient && !isInquirerRequestScoped;

    return (
      this.isDependencyTreeStatic() &&
      contextId === STATIC_CONTEXT &&
      (!this.isTransient || (isStaticTransient && !!inquirer && !inquirer.isTransient))
    );
  }

  public getStaticTransientInstances() {
    if (!this.transientMap) return [];

    const instances = [...this.transientMap.values()];
    return instances.map((item) => item.get(STATIC_CONTEXT)).filter(Boolean) as InstancePerContext<T>[];
  }

  public mergeWith(provider: Provider) {
    if (isValueProvider(provider)) {
      // @ts-ignore
      this.metatype = null;
      this.inject = null;

      this.scope = Scope.DEFAULT;

      this.setInstanceByContextId(STATIC_CONTEXT, {
        instance: provider.useValue,
        isResolved: true,
        isPending: false,
      });
    } else if (isClassProvider(provider)) {
      this.inject = null;
      this.metatype = provider.useClass;
    } else if (isFactoryProvider(provider)) {
      this.metatype = provider.useFactory;
      this.inject = provider.inject || [];
    }
  }

  private isNewable(): boolean {
    return isNull(this.inject) && this.metatype && this.metatype.prototype;
  }

  private initialize(metadata: Partial<InstanceWrapper<T>> & Partial<InstancePerContext<T>>) {
    const { instance, isResolved, ...wrapperPartial } = metadata;
    Object.assign(this, wrapperPartial);

    this.setInstanceByContextId(STATIC_CONTEXT, { instance, isResolved });

    this.scope === Scope.TRANSIENT && (this.transientMap = new Map());
  }

  private printIntrospectedAsRequestScoped() {
    if (!this.isDebugMode() || this.name === "REQUEST") {
      return;
    }
    if (isString(this.name)) {
      InstanceWrapper.logger.log(
        `${colors.cyanBright(this.name)}${colors.green(" introspected as ")}${colors.magentaBright("request-scoped")}`,
      );
    }
  }

  private printIntrospectedAsDurable() {
    if (!this.isDebugMode()) {
      return;
    }
    if (isString(this.name)) {
      InstanceWrapper.logger.log(
        `${colors.cyanBright(this.name)}${colors.green(" introspected as ")}${colors.magentaBright("durable")}`,
      );
    }
  }

  private isDebugMode(): boolean {
    return !!process.env.VENOK_DEBUG;
  }

  private generateUuid(): string {
    let key = this.name?.toString() ?? this.token?.toString();
    key += this.host?.name ?? "";

    return key ? UuidFactory.get(key) : randomStringGenerator();
  }
}
