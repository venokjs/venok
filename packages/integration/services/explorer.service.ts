import {
  Injectable,
  MetadataScanner,
  Reflector,
  ROUTE_ARGS_METADATA,
  VenokContainer,
  VenokContextCreatorInterface,
  VenokParamsFactoryInterface,
} from "@venok/core";

import { Injector, InstanceWrapper, STATIC_CONTEXT } from "@venok/core/injector";
import { ExecutionContextHost, VenokContextCreator } from "@venok/core/context";
import { VenokExceptionFilterContext } from "@venok/core/filters";

import { DiscoveryService } from "@venok/integration/services/discovery.service";

@Injectable()
export abstract class ExplorerService<T = any> extends Reflector {
  protected abstract readonly paramsFactory: VenokParamsFactoryInterface;

  protected readonly type: string = "native";
  protected readonly withRequestScope: boolean = false;
  protected readonly requestArgIndex: number = 0;
  protected readonly options = { guards: true, filters: false, interceptors: true };

  protected readonly exceptionsFilter: VenokExceptionFilterContext = new VenokExceptionFilterContext(
    this.container,
    this.container.applicationConfig,
  );
  protected contextCreator: VenokContextCreatorInterface = this.externalContextCreator;

  protected readonly wrappers = this.discoveryService.getProviders().filter((wrapper) => {
    const { instance } = wrapper;
    const prototype = instance ? Object.getPrototypeOf(instance) : null;

    return this.withRequestScope ? instance && prototype : instance && prototype && wrapper.isDependencyTreeStatic();
  });

  private readonly exceptionFiltersCache = new WeakMap();

  constructor(
    protected readonly container: VenokContainer,
    protected readonly discoveryService: DiscoveryService,
    protected readonly externalContextCreator: VenokContextCreator,
    protected readonly metadataScanner: MetadataScanner,
  ) {
    super();
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
