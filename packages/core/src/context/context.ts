import type {
  ArgumentMetadata,
  ContextType,
  ExternalContextOptions,
  ExternalHandlerMetadata,
  ParamProperties,
  ParamsMetadata,
  PipeTransform,
  VenokContextCreatorInterface,
  VenokParamsFactoryInterface
} from "~/interfaces/index.js";

import { isObservable, lastValueFrom, Observable } from "rxjs";

import { ModulesContainer } from "~/injector/module/container.js";
import { STATIC_CONTEXT } from "~/injector/constants.js";
import { VenokContainer } from "~/injector/container.js";
import { HandlerMetadataStorage } from "~/storage/handler-metadata.storage.js";
import { ContextUtils } from "~/helpers/context.helper.js";
import { isEmpty } from "~/helpers/shared.helper.js";
import { InterceptorsConsumer } from "~/interceptors/consumer.js";
import { InterceptorsContextCreator } from "~/interceptors/context-creator.js";
import { GuardsConsumer } from "~/guards/consumer.js";
import { GuardsContextCreator } from "~/guards/context-creator.js";
import { PipesConsumer } from "~/pipes/consumer.js";
import { PipesContextCreator } from "~/pipes/context-creator.js";
import { VenokExceptionFilterContext } from "~/filters/context.js";
import { VenokProxy } from "~/context/proxy.js";
import { Reflector } from "~/services/reflector.service.js";
import { RuntimeException } from "~/errors/exceptions/runtime.exception.js";
import { CUSTOM_ROUTE_ARGS_METADATA, FORBIDDEN_MESSAGE } from "~/constants.js";

export class VenokContextCreator implements VenokContextCreatorInterface {
  public readonly contextUtils = new ContextUtils();
  public readonly venokProxy = new VenokProxy();
  public readonly reflector = new Reflector();
  private readonly handlerMetadataStorage = new HandlerMetadataStorage();
  public container!: VenokContainer;

  constructor(
    private readonly guardsContextCreator: GuardsContextCreator,
    private readonly guardsConsumer: GuardsConsumer,
    private readonly interceptorsContextCreator: InterceptorsContextCreator,
    private readonly interceptorsConsumer: InterceptorsConsumer,
    private readonly modulesContainer: ModulesContainer,
    private readonly pipesContextCreator: PipesContextCreator,
    private readonly pipesConsumer: PipesConsumer,
    protected readonly filtersContextCreator: VenokExceptionFilterContext
  ) {}

  static fromContainer(
    container: VenokContainer,
    contextClass: typeof VenokContextCreator = VenokContextCreator,
    filtersContextClass: typeof VenokExceptionFilterContext = VenokExceptionFilterContext
  ): VenokContextCreator {
    const guardsContextCreator = new GuardsContextCreator(container, container.applicationConfig);
    const guardsConsumer = new GuardsConsumer();
    const interceptorsContextCreator = new InterceptorsContextCreator(container, container.applicationConfig);
    const interceptorsConsumer = new InterceptorsConsumer();
    const pipesContextCreator = new PipesContextCreator(container, container.applicationConfig);
    const pipesConsumer = new PipesConsumer();
    const filtersContextCreator = new filtersContextClass(container, container.applicationConfig);

    const venokContextCreator = new contextClass(
      guardsContextCreator,
      guardsConsumer,
      interceptorsContextCreator,
      interceptorsConsumer,
      container.getModules(),
      pipesContextCreator,
      pipesConsumer,
      filtersContextCreator
    );
    venokContextCreator.container = container;
    return venokContextCreator;
  }

  public create<TParamsMetadata extends ParamsMetadata = ParamsMetadata, TContext extends string = ContextType>(
    instance: object,
    callback: (...args: unknown[]) => unknown,
    methodName: string,
    metadataKey?: string,
    paramsFactory?: VenokParamsFactoryInterface,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
    options: ExternalContextOptions = {
      interceptors: true,
      guards: true,
      filters: true,
      callback: () => {},
    },
    contextType: TContext = "native" as TContext
  ) {
    const module = this.getContextModuleKey(instance.constructor);
    const { argsLength, paramtypes, getParamsMetadata } = this.getMetadata<TParamsMetadata, TContext>(
      instance,
      methodName,
      metadataKey,
      paramsFactory,
      contextType
    );
    const pipes = this.pipesContextCreator.create(instance, callback, module, contextId, inquirerId);
    const guards = this.guardsContextCreator.create(instance, callback, module, contextId, inquirerId);
    const exceptionFilter = this.filtersContextCreator.create(instance, callback, module, contextId, inquirerId);
    const interceptors = options.interceptors
      ? this.interceptorsContextCreator.create(instance, callback, module, contextId, inquirerId)
      : [];

    const paramsMetadata = getParamsMetadata(module, contextId, inquirerId);
    const paramsOptions = paramsMetadata ? this.contextUtils.mergeParamsMetatypes(paramsMetadata, paramtypes) : [];

    const fnCanActivate = options.guards ? this.createGuardsFn(guards, instance, callback, contextType) : null;
    const fnApplyPipes = this.createPipesFn(pipes, paramsOptions, contextType);
    const handler =
      (initialArgs: unknown[], ...args: unknown[]) =>
        async () => {
          if (fnApplyPipes) {
            await fnApplyPipes(initialArgs, ...args);
            return callback.apply(instance, initialArgs);
          }
          return callback.apply(instance, args);
        };

    const target = async (...args: any[]) => {
      const initialArgs = this.contextUtils.createNullArray(argsLength);
       
      fnCanActivate && (await fnCanActivate(args));

      const result = await this.interceptorsConsumer.intercept(
        interceptors,
        args,
        instance,
        callback,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        handler(initialArgs, ...args),
        contextType
      );
      const done = await this.transformToResult(result);
      // eslint-disable-next-line @typescript-eslint/await-thenable,@typescript-eslint/no-unsafe-argument
      if (options.callback) await options.callback(done, ...args);
      return done;
    };
    return options.filters ? this.venokProxy.createProxy(target, exceptionFilter, contextType) : target;
  }

  public getMetadata<TMetadata, TContext extends string = ContextType>(
    instance: object,
    methodName: string,
    metadataKey?: string,
    paramsFactory?: VenokParamsFactoryInterface,
    contextType?: TContext
  ): ExternalHandlerMetadata {
    const cacheMetadata = this.handlerMetadataStorage.get(instance, methodName);
    if (cacheMetadata) return cacheMetadata;

    const metadata =
      this.contextUtils.reflectCallbackMetadata<TMetadata>(instance, methodName, metadataKey || "") || {};
    const keys = Object.keys(metadata);
    const argsLength = this.contextUtils.getArgumentsLength(keys, metadata);
    const paramtypes = this.contextUtils.reflectCallbackParamtypes(instance, methodName);
    const contextFactory = this.contextUtils.getContextFactory<TContext>(
      // @ts-expect-error Mismatch types
      contextType,
      instance,
      // @ts-expect-error Mismatch types
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      instance[methodName]
    );
    const getParamsMetadata = (moduleKey: string, contextId = STATIC_CONTEXT, inquirerId?: string) =>
      paramsFactory
        ? this.exchangeKeysForValues(keys, metadata, moduleKey, paramsFactory, contextId, inquirerId, contextFactory)
        : (null as any);

    const handlerMetadata: ExternalHandlerMetadata = {
      argsLength,
      paramtypes,
      getParamsMetadata,
    };
    this.handlerMetadataStorage.set(instance, methodName, handlerMetadata);
    return handlerMetadata;
  }

  public getContextModuleKey(moduleCtor: Function | undefined): string {
    const emptyModuleKey = "";
    if (!moduleCtor) return emptyModuleKey;

    const moduleContainerEntries = this.modulesContainer.entries();
    for (const [key, moduleRef] of moduleContainerEntries) {
      // REFACTOR
      if (moduleRef.hasProvider && moduleRef.hasProvider(moduleCtor)) return key;
    }
    return emptyModuleKey;
  }

  public exchangeKeysForValues<TMetadata extends Record<string | symbol, any>>(
    keys: string[],
    metadata: TMetadata,
    moduleContext: string,
    paramsFactory: VenokParamsFactoryInterface,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
    contextFactory = this.contextUtils.getContextFactory("native")
  ): ParamProperties[] {
    this.pipesContextCreator.setModuleContext(moduleContext);

    return keys.map((key) => {
      const { index, data, pipes: pipesCollection } = metadata[key];
      const pipes = this.pipesContextCreator.createConcreteContext(pipesCollection, contextId, inquirerId);
      const type = this.contextUtils.mapParamType(key);

      if (key.includes(CUSTOM_ROUTE_ARGS_METADATA)) {
        const { factory } = metadata[key];
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const customExtractValue = this.contextUtils.getCustomFactory(factory, data, contextFactory);
        return { index, extractValue: customExtractValue, type, data, pipes };
      }

      const extractValue = (...args: unknown[]) => paramsFactory.exchangeKeyForValue(+type, data, args);

      return { index, extractValue, type, data, pipes };
    });
  }

  public createPipesFn(
    pipes: PipeTransform[],
    paramsOptions: (ParamProperties & { metatype?: unknown })[],
    contextType: string
  ) {
    const pipesFn = async (args: unknown[], ...params: unknown[]) => {
      const resolveParamValue = async (param: ParamProperties & { metatype?: unknown }) => {
        const { index, extractValue, type, data, metatype, pipes: paramPipes } = param;
        const value = extractValue(...params);

        args[index] = await this.getParamValue(
          value,
          {
            metatype: metatype as any,
            type,
            data: data as any,
            contextType,
          },
          pipes.concat(paramPipes)
        );
      };
      await Promise.all(paramsOptions.map(resolveParamValue));
    };
    return paramsOptions.length ? pipesFn : null;
  }

  public async getParamValue<T>(value: T, metadata: ArgumentMetadata, pipes: PipeTransform[]): Promise<any> {
    return isEmpty(pipes) ? value : this.pipesConsumer.apply(value, metadata, pipes);
  }

  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  public async transformToResult(resultOrDeferred: Observable<any> | any) {
    if (isObservable(resultOrDeferred)) return lastValueFrom(resultOrDeferred);

    return resultOrDeferred;
  }

  public createGuardsFn<TContext extends string = ContextType>(
    guards: any[],
    instance: object,
    callback: (...args: any[]) => any,
    contextType?: TContext
  ): Function | null {
    const canActivateFn = async (args: any[]) => {
      const canActivate = await this.guardsConsumer.tryActivate<TContext>(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        guards,
        args,
        instance,
        callback,
        contextType
      );
      if (!canActivate) throw new RuntimeException(FORBIDDEN_MESSAGE);
    };
    return guards.length ? canActivateFn : null;
  }
}
