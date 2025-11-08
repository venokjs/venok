import type { ExternalContextOptions, VenokParamsFactoryInterface } from "@venok/core";

import type { ExplorerSettings } from "~/interfaces/services/explorer.interface.js";

import {
  ExecutionContextHost,
  Injectable,
  Injector,
  InstanceWrapper,
  MetadataScanner,
  Reflector,
  ROUTE_ARGS_METADATA,
  STATIC_CONTEXT,
  VenokContainer,
  VenokContextCreator,
  VenokExceptionFilterContext
} from "@venok/core";

import { DiscoveryService } from "~/services/discovery.service.js";

@Injectable()
export abstract class ExplorerService<T = any> extends Reflector {
  protected abstract readonly paramsFactory: VenokParamsFactoryInterface;

  protected readonly type: string;
  protected readonly withRequestScope: boolean;
  protected readonly requestArgIndex: number;
  protected readonly options: Omit<ExternalContextOptions, "callback">;
  protected readonly metadataKey: string;

  protected readonly exceptionsFilterClass: typeof VenokExceptionFilterContext;
  protected readonly contextCreatorClass: typeof VenokContextCreator;

  protected readonly exceptionsFilter: VenokExceptionFilterContext;
  protected readonly contextCreator: VenokContextCreator;

  protected readonly wrappers: InstanceWrapper[];

  private readonly exceptionFiltersCache = new WeakMap();

  constructor(
    protected readonly container: VenokContainer,
    protected readonly discoveryService: DiscoveryService,
    protected readonly metadataScanner: MetadataScanner
  ) {
    super();
    const {
      contextType = "native",
      contextCreatorClass = VenokContextCreator,
      exceptionsFilterClass = VenokExceptionFilterContext,
      isRequestScopeSupported = false,
      options = { guards: true, filters: true, interceptors: true, callback: () => {} },
      requestContextArgIndex = 0,
      metadataKey = ROUTE_ARGS_METADATA,
    } = this.getSettings();

    this.options = options;
    this.type = contextType;
    this.metadataKey = metadataKey;
    this.requestArgIndex = requestContextArgIndex;
    this.contextCreatorClass = contextCreatorClass;
    this.withRequestScope = isRequestScopeSupported;
    this.exceptionsFilterClass = exceptionsFilterClass;

    this.contextCreator = this.contextCreatorClass.fromContainer(container, this.contextCreatorClass, this.exceptionsFilterClass);
    this.exceptionsFilter = new this.exceptionsFilterClass(this.container, this.container.applicationConfig);
    this.wrappers = this.discoveryService.getProviders().filter((wrapper) => {
      const { instance } = wrapper;
      const prototype = instance ? Object.getPrototypeOf(instance) : null;

      return this.withRequestScope ? instance && prototype : instance && prototype && wrapper.isDependencyTreeStatic();
    });
  }

  public explore(metadataKey: string): T[] {
    return this.wrappers.flatMap((wrapper) => this.filterProperties(wrapper, metadataKey)).filter(Boolean) as T[];
  }

  protected abstract getSettings(): ExplorerSettings;

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

  protected createContextCallback(
    instance: object,
    callback: (...args: any[]) => any,
    methodName: string,
    contextId = STATIC_CONTEXT,
    inquirerId: string | undefined = undefined
  ) {
    return this.contextCreator.create(
      instance,
      callback,
      methodName,
      this.metadataKey,
      this.paramsFactory,
      contextId,
      inquirerId,
      this.options,
      this.type
    );
  }

  protected getContextArgForRequest(args: any[]) {
    return this.paramsFactory.exchangeKeyForValue(this.requestArgIndex, undefined, args);
  }

  private createRequestScopeContextCallback(wrapper: InstanceWrapper, methodName: string) {
    const { instance } = wrapper;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const moduleKey: string = this.contextCreator.getContextModuleKey(instance.constructor);
    const moduleRef = this.container.getModuleByKey(moduleKey);
    const collection = moduleRef.injectables;

    const isTreeDurable = wrapper.isDependencyTreeDurable();

    return async (...args: any[]) => {
      try {
        const contextArg = this.getContextArgForRequest(args);
        const contextId = this.container.getContextId(contextArg, isTreeDurable);
        const contextInstance = await new Injector().loadPerContext(instance, moduleRef, collection, contextId);
        await this.createContextCallback(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          contextInstance,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          contextInstance[methodName],
          methodName,
          contextId,
          wrapper.id
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
