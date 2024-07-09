import { ApplicationConfig, CanActivate, GUARDS_METADATA, Type, VenokContainer } from "@venok/core";
import { InstanceWrapper, STATIC_CONTEXT } from "@venok/core/injector";
import { isEmpty, isFunction } from "@venok/core/helpers";
import { ContextCreator } from "@venok/core/context/creator";

export class GuardsContextCreator extends ContextCreator {
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
  ): CanActivate[] {
    this.moduleContext = module;
    return this.createContext(instance, callback, GUARDS_METADATA, contextId, inquirerId);
  }

  public createConcreteContext<T extends unknown[], R extends unknown[]>(
    metadata: T,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): R {
    if (isEmpty(metadata)) return [] as any as R;

    return metadata
      .filter((guard: any) => guard && (guard.name || guard.canActivate))
      .map((guard) => this.getGuardInstance(guard as Function, contextId, inquirerId))
      .filter((guard: any) => guard && isFunction(guard.canActivate)) as R;
  }

  public getGuardInstance(
    metatype: Function | CanActivate,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): CanActivate | null {
    const isObject = (metatype as CanActivate).canActivate;

    if (!!isObject) return metatype as CanActivate;

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

    const injectables = moduleRef.injectables;
    return injectables.get(metatype);
  }

  public getGlobalMetadata<T extends unknown[]>(contextId = STATIC_CONTEXT, inquirerId?: string): T {
    if (!this.config) return [] as any as T;

    const globalGuards = this.config.getGlobalGuards() as T;
    if (contextId === STATIC_CONTEXT && !inquirerId) return globalGuards;

    const scopedGuardWrappers = this.config.getGlobalRequestGuards() as InstanceWrapper[];
    const scopedGuards = scopedGuardWrappers
      .map((wrapper) => wrapper.getInstanceByContextId(this.getContextId(contextId, wrapper), inquirerId))
      .filter((host) => !!host)
      .map((host) => host.instance);

    return globalGuards.concat(scopedGuards) as T;
  }
}
