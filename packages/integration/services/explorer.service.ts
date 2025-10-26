import {
  Injectable,
  MetadataScanner,
  Reflector,
  ROUTE_ARGS_METADATA,
  VenokContainer,
  type VenokContextCreatorInterface,
  type VenokParamsFactoryInterface,
} from "@venok/core";

// class Reflector {
//   constructor() {}
// }

import { Injector, InstanceWrapper, STATIC_CONTEXT } from "@venok/core/injector/index.js";
import { ExecutionContextHost, VenokContextCreator } from "@venok/core/context/index.js";
import { VenokExceptionFilterContext } from "@venok/core/filters/index.js";

import { DiscoveryService } from "@venok/integration/services/discovery.service.js";

@Injectable()
export abstract class ExplorerService<T = any> extends Reflector {
  protected abstract readonly paramsFactory: VenokParamsFactoryInterface;

  protected readonly type: string = "native";
  protected readonly withRequestScope: boolean = false;
  protected readonly requestArgIndex: number = 0;
  protected readonly options = { guards: true, filters: true, interceptors: true };

  protected readonly exceptionsFilter: VenokExceptionFilterContext;
  protected contextCreator: VenokContextCreatorInterface = this.externalContextCreator;

  protected readonly wrappers: InstanceWrapper[];

  private readonly exceptionFiltersCache = new WeakMap();

  constructor(
    protected readonly container: VenokContainer,
    protected readonly discoveryService: DiscoveryService,
    protected readonly externalContextCreator: VenokContextCreator,
    protected readonly metadataScanner: MetadataScanner,
  ) {
    super();
    this.exceptionsFilter = new VenokExceptionFilterContext(this.container, this.container.applicationConfig);
    this.wrappers = this.discoveryService.getProviders().filter((wrapper) => {
      const { instance } = wrapper;
      const prototype = instance ? Object.getPrototypeOf(instance) : null;

      return this.withRequestScope ? instance && prototype : instance && prototype && wrapper.isDependencyTreeStatic();
    });
  }

  public explore(metadataKey: string): T[] {
    return this.wrappers.flatMap((wrapper) => this.filterProperties(wrapper, metadataKey)).filter(Boolean) as T[];
  }

  protected abstract filterProperties(wrapper: InstanceWrapper, metadataKey: string): NonNullable<T> | undefined;

  protected createCallback(wrapper: InstanceWrapper, methodName: string) {
    if (!this.withRequestScope)
      return this.createContextCallback(wrapper.instance, wrapper.instance[methodName], methodName);

    const isRequestScoped = !wrapper.isDependencyTreeStatic();

    return isRequestScoped
      ? this.createRequestScopeContextCallback(wrapper, methodName)
      : this.createContextCallback(wrapper.instance, wrapper.instance[methodName], methodName);
  }

  private createContextCallback(
    instance: any,
    callback: (...args: any[]) => any,
    methodName: string,
    contextId = STATIC_CONTEXT,
    inquirerId: string | undefined = undefined,
  ) {
    return this.contextCreator.create(
      instance,
      callback,
      methodName,
      ROUTE_ARGS_METADATA,
      this.paramsFactory,
      contextId,
      inquirerId,
      this.options,
      this.type,
    );
  }

  private createRequestScopeContextCallback(wrapper: InstanceWrapper, methodName: string) {
    const { instance } = wrapper;

    const moduleKey: string = this.externalContextCreator.getContextModuleKey(instance.constructor);
    const moduleRef = this.container.getModuleByKey(moduleKey);
    const collection = moduleRef.injectables;

    const isTreeDurable = wrapper.isDependencyTreeDurable();

    return async (...args: any[]) => {
      try {
        const contextId = this.container.getContextId(args[this.requestArgIndex], isTreeDurable);
        const contextInstance = await new Injector().loadPerContext(instance, moduleRef, collection, contextId);
        await this.createContextCallback(
          contextInstance,
          contextInstance[methodName],
          methodName,
          contextId,
          wrapper.id,
        )(...args);
      } catch (err) {
        let exceptionFilter = this.exceptionFiltersCache.get(instance[methodName]);
        if (!exceptionFilter) {
          exceptionFilter = this.exceptionsFilter.create(instance, instance[methodName], moduleKey);
          this.exceptionFiltersCache.set(instance[methodName], exceptionFilter);
        }
        const host = new ExecutionContextHost(args);
        exceptionFilter.next(err, host);
      }
    };
  }
}
