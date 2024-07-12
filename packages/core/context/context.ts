import { isObservable, lastValueFrom, Observable } from "rxjs";

import {
  ArgumentMetadata,
  ContextType,
  CUSTOM_ROUTE_ARGS_METADATA,
  FORBIDDEN_MESSAGE,
  GetParamsMetadata,
  ParamProperties,
  VenokParamsFactoryInterface,
  ParamsMetadata,
  PipeTransform,
  Reflector,
  VenokContainer,
  VenokContextCreatorInterface,
} from "@venok/core";

import { ModulesContainer, STATIC_CONTEXT } from "@venok/core/injector";
import { ContextUtils, isEmpty } from "@venok/core/helpers";
import { VenokProxy } from "@venok/core/context/proxy";

import { InterceptorsConsumer, InterceptorsContextCreator } from "@venok/core/interceptors";
import { GuardsConsumer, GuardsContextCreator } from "@venok/core/guards";
import { PipesConsumer, PipesContextCreator } from "@venok/core/pipes";
import { VenokExceptionFilterContext } from "@venok/core/filters";

import { RuntimeException } from "@venok/core/errors/exceptions";
import { HandlerMetadataStorage } from "@venok/core/storage/handler-metadata.storage";

export interface ExternalHandlerMetadata {
  argsLength: number;
  paramtypes: any[];
  getParamsMetadata: GetParamsMetadata;
}

export interface ExternalContextOptions {
  guards?: boolean;
  interceptors?: boolean;
  filters?: boolean;
  callback?: (result: any | Observable<any>, ...args: any[]) => void;
}

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
    protected readonly filtersContextCreator: VenokExceptionFilterContext,
  ) {}

  static fromContainer(
    container: VenokContainer,
    contextClass: typeof VenokContextCreator = VenokContextCreator,
    filtersContext: typeof VenokExceptionFilterContext = VenokExceptionFilterContext,
  ): VenokContextCreator {
    const guardsContextCreator = new GuardsContextCreator(container, container.applicationConfig);
    const guardsConsumer = new GuardsConsumer();
    const interceptorsContextCreator = new InterceptorsContextCreator(container, container.applicationConfig);
    const interceptorsConsumer = new InterceptorsConsumer();
    const pipesContextCreator = new PipesContextCreator(container, container.applicationConfig);
    const pipesConsumer = new PipesConsumer();
    const filtersContextCreator = new filtersContext(container, container.applicationConfig);

    const venokContextCreator = new contextClass(
      guardsContextCreator,
      guardsConsumer,
      interceptorsContextCreator,
      interceptorsConsumer,
      container.getModules(),
      pipesContextCreator,
      pipesConsumer,
      filtersContextCreator,
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
    contextType: TContext = "native" as TContext,
  ) {
    const module = this.getContextModuleKey(instance.constructor);
    const { argsLength, paramtypes, getParamsMetadata } = this.getMetadata<TParamsMetadata, TContext>(
      instance,
      methodName,
      metadataKey,
      paramsFactory,
      contextType,
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
        handler(initialArgs, ...args),
        contextType,
      );
      const done = await this.transformToResult(result);
      if (options.callback) await options.callback(done, ...args);
      return done;
    };
    return options.filters ? this.venokProxy.createProxy(target, exceptionFilter, contextType) : target;
  }

  public getMetadata<TMetadata, TContext extends string = ContextType>(
    instance: any,
    methodName: string,
    metadataKey?: string,
    paramsFactory?: VenokParamsFactoryInterface,
    contextType?: TContext,
  ): ExternalHandlerMetadata {
    const cacheMetadata = this.handlerMetadataStorage.get(instance, methodName);
    if (cacheMetadata) return cacheMetadata;

    const metadata =
      this.contextUtils.reflectCallbackMetadata<TMetadata>(instance, methodName, metadataKey || "") || {};
    const keys = Object.keys(metadata);
    const argsLength = this.contextUtils.getArgumentsLength(keys, metadata);
    const paramtypes = this.contextUtils.reflectCallbackParamtypes(instance, methodName);
    const contextFactory = this.contextUtils.getContextFactory<TContext>(
      contextType as any,
      instance,
      instance[methodName],
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
    contextFactory = this.contextUtils.getContextFactory("native"),
  ): ParamProperties[] {
    this.pipesContextCreator.setModuleContext(moduleContext);

    return keys.map((key) => {
      const { index, data, pipes: pipesCollection } = metadata[key];
      const pipes = this.pipesContextCreator.createConcreteContext(pipesCollection, contextId, inquirerId);
      const type = this.contextUtils.mapParamType(key);

      if (key.includes(CUSTOM_ROUTE_ARGS_METADATA)) {
        const { factory } = metadata[key];
        const customExtractValue = this.contextUtils.getCustomFactory(factory, data, contextFactory);
        return { index, extractValue: customExtractValue, type, data, pipes };
      }

      const extractValue = (...args: unknown[]) => paramsFactory.exchangeKeyForValue(type, data, args);

      return { index, extractValue, type, data, pipes };
    });
  }

  public createPipesFn(
    pipes: PipeTransform[],
    paramsOptions: (ParamProperties & { metatype?: unknown })[],
    contextType: string,
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
          pipes.concat(paramPipes),
        );
      };
      await Promise.all(paramsOptions.map(resolveParamValue));
    };
    return paramsOptions.length ? pipesFn : null;
  }

  public async getParamValue<T>(
    value: T,
    { metatype, type, data, contextType }: ArgumentMetadata,
    pipes: PipeTransform[],
  ): Promise<any> {
    return isEmpty(pipes) ? value : this.pipesConsumer.apply(value, { metatype, type, data, contextType }, pipes);
  }

  public async transformToResult(resultOrDeferred: Observable<any> | any) {
    if (isObservable(resultOrDeferred)) return lastValueFrom(resultOrDeferred);

    return resultOrDeferred;
  }

  public createGuardsFn<TContext extends string = ContextType>(
    guards: any[],
    instance: object,
    callback: (...args: any[]) => any,
    contextType?: TContext,
  ): Function | null {
    const canActivateFn = async (args: any[]) => {
      const canActivate = await this.guardsConsumer.tryActivate<TContext>(
        guards,
        args,
        instance,
        callback,
        contextType,
      );
      if (!canActivate) throw new RuntimeException(FORBIDDEN_MESSAGE);
    };
    return guards.length ? canActivateFn : null;
  }
}
