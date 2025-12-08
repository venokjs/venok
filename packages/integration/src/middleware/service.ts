import type { CoreModule, InjectionToken, InstanceWrapper, Type } from "@venok/core";

import type { BaseMiddlewareConfiguration, VenokMiddleware } from "~/interfaces/index.js";

import { ExecutionContextHost, Injectable, Injector, isUndefined, Logger, RuntimeException, STATIC_CONTEXT, VenokContainer, VenokExceptionFilterContext, VenokProxy } from "@venok/core";

import { MiddlewareContainer } from "~/middleware/container.js";
import { MiddlewareResolver } from "~/middleware/resolver.js";
import { InvalidMiddlewareException } from "~/exceptions/invalid-middleware.exception.js";

type VenokContextCallback = (...args: any[]) => void | Promise<void>;

@Injectable()
export abstract class MiddlewareService<MiddlewareConfiguration extends BaseMiddlewareConfiguration> {
  protected index: number = 0;
  protected type: string = "native";

  protected readonly exceptionsFilter: VenokExceptionFilterContext;

  private readonly venokProxy: VenokProxy = new VenokProxy();
  private readonly exceptionFiltersCache = new WeakMap();

  protected readonly logger: Logger = new Logger(MiddlewareService.name, { timestamp: true });
  protected readonly injector: Injector = new Injector();
  protected readonly middlewareContainer: MiddlewareContainer = new MiddlewareContainer();
  protected readonly resolver: MiddlewareResolver = new MiddlewareResolver(this.middlewareContainer, this.injector);

  constructor(readonly container: VenokContainer) {
    console.log("initialized");
    this.exceptionsFilter = new VenokExceptionFilterContext(this.container, this.container.applicationConfig);
  }

  public async explore(middlewareClass: any) {
    const modules = this.container.getModules();
    const moduleEntries = [...modules.entries()];
    const loadMiddlewareConfiguration = async ([moduleName, moduleRef]: [string, CoreModule]) => {
      await this.loadConfiguration(moduleRef, moduleName, middlewareClass);
      await this.resolver.resolveInstances(moduleRef, moduleName);
    };
    await Promise.all(moduleEntries.map(loadMiddlewareConfiguration));
  }

  private async loadConfiguration(moduleRef: CoreModule, moduleKey: string, middlewareClass: any) {
    const { instance } = moduleRef;
    if (!(instance as any).configure) return;

    if (!(instance instanceof middlewareClass)) return;

    const builder = this.getMiddlewareBuilder();

    try {
      await (instance as any).configure(builder);
    } catch (err) {
      // if (!this.appOptions.preview) throw err;

      const warningMessage =
        `Warning! "${moduleRef.name}" module exposes a "configure" method that throws an exception in the preview mode` +
        ` (possibly due to missing dependencies). Note: you can ignore this message, just be aware that some of those conditional middlewares will not be reflected in your graph.`;
      this.logger.warn(warningMessage);

      throw err;
    }

    const config = builder.build();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    this.middlewareContainer.insertConfig(config, moduleKey);
  }

  protected abstract getMiddlewareBuilder(): any;

  public async build() {
    const configs = this.middlewareContainer.getConfigurations();
    const registerAllConfigs = async (moduleKey: string, middlewareConfig: MiddlewareConfiguration[]) => {
      for (const config of middlewareConfig) await this.registerConfig(config, moduleKey);
    };

    const entriesSortedByDistance = [...configs.entries()].sort(([moduleA], [moduleB]) => {
      return this.container.getModuleByKey(moduleA).distance - this.container.getModuleByKey(moduleB).distance;
    });

    for (const [moduleRef, moduleConfigurations] of entriesSortedByDistance) {
      await registerAllConfigs(moduleRef, [...moduleConfigurations] as MiddlewareConfiguration[]);
    }
  }

  private async registerConfig(config: MiddlewareConfiguration, moduleKey: string) {
    const { to } = config;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    for (const info of to) await this.registerMiddleware(info, moduleKey, config);
  }

  private async registerMiddleware(to: MiddlewareConfiguration["to"][number], moduleKey: string, config: MiddlewareConfiguration) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const middlewareCollection = [].concat(config.middleware);
    const collection = this.middlewareContainer.getMiddlewareCollection(moduleKey);
    const moduleRef = this.container.getModuleByKey(moduleKey);

    for (const metatype of middlewareCollection) {
      const instanceWrapper = collection.get(metatype);
      if (isUndefined(instanceWrapper)) throw new RuntimeException();

      if (instanceWrapper.isTransient) return;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const proxy = await this.createCallback(instanceWrapper, moduleRef, collection);

      await this.registerHandler(to, proxy, config);
    }
  }

  protected abstract registerHandler(
    info: MiddlewareConfiguration["to"][number],
    proxy: (...args: any[]) => any,
    config: MiddlewareConfiguration,
  ): Promise<void> | void;

  protected async createCallback(
    wrapper: InstanceWrapper<VenokMiddleware>,
    moduleRef: CoreModule,
    collection: Map<InjectionToken, InstanceWrapper>
  ) {
    const { instance, metatype } = wrapper as { instance: VenokMiddleware; metatype: Function | Type };
    // eslint-disable-next-line @typescript-eslint/unbound-method
    if (isUndefined(instance?.use)) throw new InvalidMiddlewareException(metatype.name);

    const isStatic = wrapper.isDependencyTreeStatic();

    if (isStatic) return await this.createProxy(instance);

    const isTreeDurable = wrapper.isDependencyTreeDurable();

    return async (...args: any[]) => {
      try {
        const contextId = this.container.getContextId(args[this.index], isTreeDurable);
        const contextInstance = await this.injector.loadPerContext(instance, moduleRef, collection, contextId);
        const proxy = await this.createProxy(contextInstance, contextId);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        return proxy(...args);
      } catch (err) {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        let exceptionsHandler = this.exceptionFiltersCache.get(instance.use);
        if (!exceptionsHandler) {
          exceptionsHandler = this.exceptionsFilter.create(
            instance,
            // eslint-disable-next-line @typescript-eslint/no-misused-promises,@typescript-eslint/unbound-method
            instance.use as VenokContextCallback,
            // @ts-expect-error Mismatch types
            undefined
          );
          // eslint-disable-next-line @typescript-eslint/unbound-method
          this.exceptionFiltersCache.set(instance.use, exceptionsHandler);
        }
        const host = new ExecutionContextHost(args);
        exceptionsHandler.next(err, host);
      }
    };
  }

  // eslint-disable-next-line @typescript-eslint/require-await,@typescript-eslint/no-unused-vars
  private async createProxy<TRequest = unknown, TResponse = unknown>(
    instance: VenokMiddleware,
    contextId = STATIC_CONTEXT
  ): Promise<VenokContextCallback> {
    const exceptionsHandler = this.exceptionsFilter.create(
      instance,
      // eslint-disable-next-line @typescript-eslint/no-misused-promises,@typescript-eslint/unbound-method
      instance.use as VenokContextCallback,
      // @ts-expect-error Mismatch types
      undefined,
      contextId
    );
    const middleware = instance.use.bind(instance);
    return this.venokProxy.createProxy(middleware, exceptionsHandler, this.type);
  }
}
