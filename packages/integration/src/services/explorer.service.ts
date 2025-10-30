import type { VenokContextCreatorInterface, VenokParamsFactoryInterface } from "@venok/core";

import {
  Injectable,
  MetadataScanner,
  Reflector,
  ROUTE_ARGS_METADATA,
  VenokContainer,
  Injector,
  InstanceWrapper,
  STATIC_CONTEXT,
  ExecutionContextHost,
  VenokContextCreator,
  VenokExceptionFilterContext
} from "@venok/core";

import { DiscoveryService } from "~/services/discovery.service.js";

@Injectable()
export abstract class ExplorerService<T = any> extends Reflector {
  protected abstract readonly paramsFactory: VenokParamsFactoryInterface;

  protected readonly type: string = "native";
  protected readonly withRequestScope: boolean = false;
  protected readonly requestArgIndex: number = 0;
  protected readonly options = { guards: true, filters: true, interceptors: true };

  protected readonly exceptionsFilter: VenokExceptionFilterContext;
  protected contextCreator: VenokContextCreatorInterface;

  protected readonly wrappers: InstanceWrapper[];

  private readonly exceptionFiltersCache = new WeakMap();

  constructor(
    protected readonly container: VenokContainer,
    protected readonly discoveryService: DiscoveryService,
    protected readonly externalContextCreator: VenokContextCreator,
    protected readonly metadataScanner: MetadataScanner
  ) {
    super();
    this.contextCreator = this.externalContextCreator;
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return this.createContextCallback(wrapper.instance, wrapper.instance[methodName], methodName);

    const isRequestScoped = !wrapper.isDependencyTreeStatic();

    return isRequestScoped
      ? this.createRequestScopeContextCallback(wrapper, methodName)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      : this.createContextCallback(wrapper.instance, wrapper.instance[methodName], methodName);
  }

  private createContextCallback(
    instance: any,
    callback: (...args: any[]) => any,
    methodName: string,
    contextId = STATIC_CONTEXT,
    inquirerId: string | undefined = undefined
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
      this.type
    );
  }

  private createRequestScopeContextCallback(wrapper: InstanceWrapper, methodName: string) {
    const { instance } = wrapper;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          contextInstance[methodName],
          methodName,
          contextId,
          wrapper.id
        )(...args);
      } catch (err) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        let exceptionFilter = this.exceptionFiltersCache.get(instance[methodName]);
        if (!exceptionFilter) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          exceptionFilter = this.exceptionsFilter.create(instance, instance[methodName], moduleKey);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          this.exceptionFiltersCache.set(instance[methodName], exceptionFilter);
        }
        const host = new ExecutionContextHost(args);
        exceptionFilter.next(err, host);
      }
    };
  }
}
