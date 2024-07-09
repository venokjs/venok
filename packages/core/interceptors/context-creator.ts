import { ApplicationConfig, INTERCEPTORS_METADATA, Type, VenokContainer, VenokInterceptor } from "@venok/core";
import { InstanceWrapper, STATIC_CONTEXT } from "@venok/core/injector";
import { isEmpty, isFunction } from "@venok/core/helpers";
import { ContextCreator } from "@venok/core/context/creator";

export class InterceptorsContextCreator extends ContextCreator {
  private moduleContext!: string;

  constructor(
    private readonly container: VenokContainer,
    private readonly config?: ApplicationConfig,
  ) {
    super();
  }

  public create(
    instance: object,
    callback: (...args: unknown[]) => unknown,
    module: string,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): VenokInterceptor[] {
    this.moduleContext = module;
    return this.createContext(instance, callback, INTERCEPTORS_METADATA, contextId, inquirerId);
  }

  public createConcreteContext<T extends any[], R extends any[]>(
    metadata: T,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): R {
    if (isEmpty(metadata)) return [] as any as R;

    return metadata
      .filter((interceptor) => interceptor && (interceptor.name || interceptor.intercept))
      .map((interceptor) => this.getInterceptorInstance(interceptor, contextId, inquirerId))
      .filter((interceptor: any) => interceptor && isFunction(interceptor.intercept)) as R;
  }

  public getInterceptorInstance(
    metatype: Function | VenokInterceptor,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): VenokInterceptor | null {
    const isObject = (metatype as VenokInterceptor).intercept;

    if (!!isObject) return metatype as VenokInterceptor;

    const instanceWrapper = this.getInstanceByMetatype(metatype as Type);
    if (!instanceWrapper) return null;

    const instanceHost = instanceWrapper.getInstanceByContextId(
      this.getContextId(contextId, instanceWrapper),
      inquirerId,
    );

    return instanceHost && instanceHost.instance;
  }

  public getInstanceByMetatype(metatype: Type): InstanceWrapper | undefined {
    if (!this.moduleContext) return;

    const collection = this.container.getModules();
    const moduleRef = collection.get(this.moduleContext);
    if (!moduleRef) return;

    return moduleRef.injectables.get(metatype);
  }

  public getGlobalMetadata<T extends unknown[]>(contextId = STATIC_CONTEXT, inquirerId?: string): T {
    if (!this.config) return [] as any as T;

    const globalInterceptors = this.config.getGlobalInterceptors() as T;
    if (contextId === STATIC_CONTEXT && !inquirerId) return globalInterceptors;

    const scopedInterceptorWrappers = this.config.getGlobalRequestInterceptors() as InstanceWrapper[];
    const scopedInterceptors = scopedInterceptorWrappers
      .map((wrapper) => wrapper.getInstanceByContextId(this.getContextId(contextId, wrapper), inquirerId))
      .filter((host) => !!host)
      .map((host) => host.instance);

    return globalInterceptors.concat(scopedInterceptors) as T;
  }
}
