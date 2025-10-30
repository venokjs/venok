import type { ContextId, IntrospectionResult, ModuleRefGetOrResolveOpts, Type } from "~/interfaces/index.js";

import { AbstractInstanceResolver } from "~/injector/instance/resolver.js";
import { InstanceLinksHost } from "~/injector/instance/links-host.js";
import { InstanceWrapper } from "~/injector/instance/wrapper.js";
import { getClassScope } from "~/injector/helpers/class-scope.helper.js";
import { Injector } from "~/injector/injector.js";
import { isDurable } from "~/injector/helpers/is-durable.helper.js";
import { Module } from "~/injector/module/module.js";
import { VenokContainer } from "~/injector/container.js";
import { Scope } from "~/enums/scope.enum.js";

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
    // eslint-disable-next-line @typescript-eslint/no-misused-promises,no-async-promise-executor
    return new Promise<T>(async (resolve, reject) => {
      try {
        const callback = async (instances: any[]) => {
          const properties = await this.injector.resolveProperties(wrapper, moduleRef, undefined, contextId);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          const instance = new type(...instances);
          this.injector.applyProperties(instance, properties);
          resolve(instance);
        };
        await this.injector.resolveConstructorParams<T>(wrapper, moduleRef, null, callback, contextId);
      } catch (err) {
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        reject(err);
      }
    });
  }
}
