import { Injector } from "@venok/core/injector/injector";
import { Scope, Type } from "@venok/core/interfaces";
import { ContextId, InstanceWrapper } from "@venok/core/injector/instance/wrapper";
import { IntrospectionResult } from "@venok/core/interfaces/modules";
import { Module } from "@venok/core/injector/module/module";
import { AbstractInstanceResolver } from "@venok/core/injector/instance/resolver";
import { InstanceLinksHost } from "@venok/core/injector/instance/links-host";
import { VenokContainer } from "@venok/core/injector/container";
import { getClassScope } from "@venok/core/injector/helpers/class-scope.helper";
import { isDurable } from "@venok/core/injector/helpers/is-durable.helper";

export interface ModuleRefGetOrResolveOpts {
  /**
   * If enabled, lookup will only be performed in the host module.
   * @default true
   */
  strict?: boolean;
  /**
   * If enabled, instead of returning a first instance registered under a given token,
   * a list of instances will be returned.
   * @default false
   */
  each?: boolean;
}

export abstract class ModuleRef extends AbstractInstanceResolver {
  protected readonly injector = new Injector();
  private _instanceLinksHost!: InstanceLinksHost;

  protected get instanceLinksHost() {
    if (!this._instanceLinksHost) {
      this._instanceLinksHost = new InstanceLinksHost(this.container);
    }
    return this._instanceLinksHost;
  }

  constructor(protected readonly container: VenokContainer) {
    super();
  }

  /**
   * Retrieves an instance of either injectable or controller, otherwise, throws exception.
   * @returns {TResult}
   */
  abstract get<TInput = any, TResult = TInput>(typeOrToken: Type<TInput> | Function | string | symbol): TResult;
  /**
   * Retrieves an instance of either injectable or controller, otherwise, throws exception.
   * @returns {TResult}
   */
  abstract get<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
    options: {
      /**
       * If enabled, lookup will only be performed in the host module.
       * @default true
       */
      strict?: boolean;
      /** This indicates that only the first instance registered will be returned. */
      each?: undefined | false;
    },
  ): TResult;
  /**
   * Retrieves a list of instances of either injectables or controllers, otherwise, throws exception.
   * @returns {Array<TResult>}
   */
  abstract get<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
    options: {
      /**
       * If enabled, lookup will only be performed in the host module.
       * @default true
       */
      strict?: boolean;
      /** This indicates that a list of instances will be returned. */
      each: true;
    },
  ): Array<TResult>;
  /**
   * Retrieves an instance (or a list of instances) of either injectable or controller, otherwise, throws exception.
   * @returns {TResult | Array<TResult>}
   */
  abstract get<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
    options?: ModuleRefGetOrResolveOpts,
  ): TResult | Array<TResult>;

  /**
   * Resolves transient or request-scoped instance of either injectable or controller, otherwise, throws exception.
   * @returns {Array<TResult>}
   */
  abstract resolve<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
  ): Promise<TResult>;
  /**
   * Resolves transient or request-scoped instance of either injectable or controller, otherwise, throws exception.
   * @returns {Array<TResult>}
   */
  abstract resolve<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
    contextId?: { id: number },
  ): Promise<TResult>;
  /**
   * Resolves transient or request-scoped instance of either injectable or controller, otherwise, throws exception.
   * @returns {Array<TResult>}
   */
  abstract resolve<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
    contextId?: { id: number },
    options?: { strict?: boolean; each?: undefined | false },
  ): Promise<TResult>;
  /**
   * Resolves transient or request-scoped instances of either injectables or controllers, otherwise, throws exception.
   * @returns {Array<TResult>}
   */
  abstract resolve<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
    contextId?: { id: number },
    options?: { strict?: boolean; each: true },
  ): Promise<Array<TResult>>;
  /**
   * Resolves transient or request-scoped instance (or a list of instances) of either injectable or controller, otherwise, throws exception.
   * @returns {Promise<TResult | Array<TResult>>}
   */
  abstract resolve<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
    contextId?: { id: number },
    options?: ModuleRefGetOrResolveOpts,
  ): Promise<TResult | Array<TResult>>;

  public abstract create<T = any>(type: Type<T>, contextId?: ContextId): Promise<T>;

  public introspect<T = any>(token: Type<T> | string | symbol): IntrospectionResult {
    const { wrapperRef } = this.instanceLinksHost.get(token);

    let scope = Scope.DEFAULT;
    if (!wrapperRef.isDependencyTreeStatic()) {
      scope = Scope.REQUEST;
    } else if (wrapperRef.isTransient) {
      scope = Scope.TRANSIENT;
    }
    return { scope };
  }

  // public registerRequestByContextId<T = any>(request: T, contextId: ContextId) {
  //   this.container.registerRequestProvider(request, contextId);
  // }

  protected async instantiateClass<T = any>(type: Type<T>, moduleRef: Module, contextId?: ContextId): Promise<T> {
    const wrapper = new InstanceWrapper({
      name: type && type.name,
      metatype: type,
      isResolved: false,
      scope: getClassScope(type),
      durable: isDurable(type),
      host: moduleRef,
    });
    return new Promise<T>(async (resolve, reject) => {
      try {
        const callback = async (instances: any[]) => {
          const properties = await this.injector.resolveProperties(wrapper, moduleRef, undefined, contextId);
          const instance = new type(...instances);
          this.injector.applyProperties(instance, properties);
          resolve(instance);
        };
        await this.injector.resolveConstructorParams<T>(wrapper, moduleRef, null, callback, contextId);
      } catch (err) {
        reject(err);
      }
    });
  }
}
