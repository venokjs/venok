import { ApplicationConfig, PIPES_METADATA, type PipeTransform, type Type, VenokContainer } from "@venok/core";
import { InstanceWrapper, STATIC_CONTEXT } from "@venok/core/injector/index.js";
import { isEmpty, isFunction } from "@venok/core/helpers/index.js";
import { ContextCreator } from "@venok/core/context/creator.js";

export class PipesContextCreator extends ContextCreator {
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
    moduleKey: string,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): PipeTransform[] {
    this.moduleContext = moduleKey;
    return this.createContext(instance, callback, PIPES_METADATA, contextId, inquirerId);
  }

  public createConcreteContext<T extends any[], R extends any[]>(
    metadata: T,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): R {
    if (isEmpty(metadata)) return [] as any as R;

    return metadata
      .filter((pipe: any) => pipe && (pipe.name || pipe.transform))
      .map((pipe) => this.getPipeInstance(pipe, contextId, inquirerId))
      .filter((pipe) => pipe && pipe.transform && isFunction(pipe.transform)) as R;
  }

  public getPipeInstance(
    pipe: Function | PipeTransform,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): PipeTransform | null {
    const isObject = (pipe as PipeTransform).transform;

    if (!!isObject) return pipe as PipeTransform;

    const instanceWrapper = this.getInstanceByMetatype(pipe as Type);
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

    const globalPipes = this.config.getGlobalPipes() as T;
    if (contextId === STATIC_CONTEXT && !inquirerId) return globalPipes;

    const scopedPipeWrappers = this.config.getGlobalRequestPipes() as InstanceWrapper[];
    const scopedPipes = scopedPipeWrappers
      .map((wrapper) => wrapper.getInstanceByContextId(this.getContextId(contextId, wrapper), inquirerId))
      .filter((host) => !!host)
      .map((host) => host.instance);

    return globalPipes.concat(scopedPipes) as T;
  }

  public setModuleContext(context: string) {
    this.moduleContext = context;
  }
}
