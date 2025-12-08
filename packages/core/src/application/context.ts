import type {
  Abstract,
  CanActivate,
  ContextId,
  DynamicModule,
  ExceptionFilter,
  LoggerService,
  LogLevel,
  PipeTransform,
  Type,
  VenokInterceptor
} from "~/interfaces/index.js";
import type { GetOrResolveOptions, SelectOptions, VenokApplicationContext } from "~/interfaces/application/index.js";

import { ApplicationContextOptions } from "~/interfaces/application/index.js";
import { UnknownModuleException } from "~/errors/exceptions/unknown-module.exception.js";
import { callBeforeAppShutdownHook } from "~/hooks/before-app-shutdown.hook.js";
import { callModuleBootstrapHook } from "~/hooks/on-app-bootstrap.hook.js";
import { AbstractInstanceResolver } from "~/injector/instance/resolver.js";
import { callModuleDestroyHook } from "~/hooks/on-module-destroy.hook.js";
import { createContextId } from "~/helpers/context-id-factory.helper.js";
import { callAppShutdownHook } from "~/hooks/on-app-shutdown.hook.js";
import { callModuleInitHook } from "~/hooks/on-module-init.hook.js";
import { InstanceLinksHost } from "~/injector/instance/links-host.js";
import { ShutdownSignal } from "~/enums/shutdown-signal.enum.js";
import { ModuleCompiler } from "~/injector/module/compiler.js";
import { ApplicationConfig } from "~/application/config.js";
import { VenokContainer } from "~/injector/container.js";
import { Logger } from "~/services/logger.service.js";
import { isEmpty } from "~/helpers/shared.helper.js";
import { Module } from "~/injector/module/module.js";
import { Injector } from "~/injector/injector.js";
import { MESSAGES } from "~/constants.js";

type ShutdownSignalKeys = keyof typeof ShutdownSignal;

/**
 * @publicApi
 */
export class ApplicationContext<TOptions extends ApplicationContextOptions = ApplicationContextOptions>
  extends AbstractInstanceResolver
  implements VenokApplicationContext {
  protected isInitialized = false;
  protected injector: Injector;
  protected readonly logger = new Logger(ApplicationContext.name, {
    timestamp: true,
  });

  private shouldFlushLogsOnOverride = false;
  private readonly activeShutdownSignals = new Array<string>();
  private readonly moduleCompiler = new ModuleCompiler();
  private shutdownCleanupRef?: (...args: unknown[]) => unknown;
  private _instanceLinksHost!: InstanceLinksHost;
  private _moduleRefsForHooksByDistance?: Array<Module>;
  private initializationPromise?: Promise<void>;

  protected get instanceLinksHost() {
    if (!this._instanceLinksHost) {
      this._instanceLinksHost = new InstanceLinksHost(this.container);
    }
    return this._instanceLinksHost;
  }

  constructor(
    public readonly container: VenokContainer,
    protected readonly config: ApplicationConfig,
    protected readonly appOptions: TOptions = {} as TOptions,
    private contextModule: Module = null as any,
    private readonly scope = new Array<Type<any>>()
  ) {
    super();
    this.injector = new Injector();

    if (!this.contextModule) this.selectContextModule();

    if (this.appOptions.preview) this.printInPreviewModeWarning();
  }

  public selectContextModule() {
    const modules = this.container.getModules().values();
    this.contextModule = modules.next().value!;
  }

  /**
   * Allows navigating through the modules tree, for example, to pull out a specific instance from the selected module.
   * @returns {VenokApplicationContext}
   */
  public select<T>(moduleType: Type<T> | DynamicModule, selectOptions?: SelectOptions): VenokApplicationContext {
    const modulesContainer = this.container.getModules();
    const contextModuleCtor = this.contextModule.metatype;
    const scope = this.scope.concat(contextModuleCtor);

    const moduleTokenFactory = this.container.getModuleTokenFactory();
    const { type, dynamicMetadata } = this.moduleCompiler.extractMetadata(moduleType);
    const token = moduleTokenFactory.create(type, dynamicMetadata);

    const selectedModule = modulesContainer.get(token);
    if (!selectedModule) throw new UnknownModuleException(type.name);

    const options =
      typeof selectOptions?.abortOnError !== "undefined" ? { ...this.appOptions, ...selectOptions } : this.appOptions;

    return new ApplicationContext(this.container, this.config, options, selectedModule, scope);
  }

  /**
   * Retrieves an instance of either injectable or controller, otherwise, throws exception.
   * @returns {TResult}
   */
  public get<TInput = any, TResult = TInput>(typeOrToken: Type<TInput> | Function | string | symbol): TResult;
  /**
   * Retrieves an instance of either injectable or controller, otherwise, throws exception.
   * @returns {TResult}
   */
  public get<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
    options: {
      strict?: boolean;
      each?: undefined | false;
    },
  ): TResult;
  /**
   * Retrieves a list of instances of either injectables or controllers, otherwise, throws exception.
   * @returns {Array<TResult>}
   */
  public get<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
    options: {
      strict?: boolean;
      each: true;
    },
  ): Array<TResult>;
  /**
   * Retrieves an instance (or a list of instances) of either injectable or controller, otherwise, throws exception.
   * @returns {TResult | Array<TResult>}
   */
  public get<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Abstract<TInput> | string | symbol,
    options: GetOrResolveOptions = { strict: false }
  ): TResult | Array<TResult> {
    return !(options && options.strict)
      ? this.find<TInput, TResult>(typeOrToken, options)
      : this.find<TInput, TResult>(typeOrToken, { moduleId: this.contextModule?.id, each: options.each });
  }

  /**
   * Resolves transient or request-scoped instance of either injectable or controller, otherwise, throws exception.
   * @returns {Array<TResult>}
   */
  public resolve<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
  ): Promise<TResult>;
  /**
   * Resolves transient or request-scoped instance of either injectable or controller, otherwise, throws exception.
   * @returns {Array<TResult>}
   */
  public resolve<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
    contextId?: { id: number },
  ): Promise<TResult>;
  /**
   * Resolves transient or request-scoped instance of either injectable or controller, otherwise, throws exception.
   * @returns {Array<TResult>}
   */
  public resolve<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
    contextId?: { id: number },
    options?: { strict?: boolean; each?: undefined | false },
  ): Promise<TResult>;
  /**
   * Resolves transient or request-scoped instances of either injectables or controllers, otherwise, throws exception.
   * @returns {Array<TResult>}
   */
  public resolve<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
    contextId?: { id: number },
    options?: { strict?: boolean; each: true },
  ): Promise<Array<TResult>>;
  /**
   * Resolves transient or request-scoped instance (or a list of instances) of either injectable or controller, otherwise, throws exception.
   * @returns {Promise<TResult | Array<TResult>>}
   */
  public resolve<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Abstract<TInput> | string | symbol,
    contextId = createContextId(),
    options: GetOrResolveOptions = { strict: false }
  ): Promise<TResult | Array<TResult>> {
    return this.resolvePerContext<TInput, TResult>(typeOrToken, this.contextModule, contextId, options);
  }

  /**
   * Registers the request/context object for a given context ID (DI container sub-tree).
   * @returns {void}
   */
  public registerRequestByContextId<T = any>(request: T, contextId: ContextId) {
    this.container.registerRequestProvider(request, contextId);
  }

  /**
   * Initializes the Venok application.
   * Calls the Venok lifecycle events.
   *
   * @returns {Promise<this>} The ApplicationContext instance as Promise
   */
  public async init(): Promise<this> {
    if (this.isInitialized) return this;

    // eslint-disable-next-line @typescript-eslint/no-misused-promises,no-async-promise-executor
    this.initializationPromise = this.initializationPromise = new Promise(async (resolve, reject) => {
      try {
        await this.callInitHook();
        await this.callBootstrapHook();
        resolve();
      } catch (err) {
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        reject(err);
      }
    });
    await this.initializationPromise;

    this.isInitialized = true;
    return this;
  }

  /**
   * Terminates the application
   * @returns {Promise<void>}
   */
  public async close(signal?: string): Promise<void> {
    await this.initializationPromise;
    await this.callDestroyHook();
    await this.callBeforeShutdownHook(signal);
    await this.dispose();
    await this.callShutdownHook(signal);
    this.unsubscribeFromProcessSignals();
  }

  /**
   * Sets custom logger service.
   * Flushes buffered logs if auto flush is on.
   * @returns {void}
   */
  public useLogger(logger: LoggerService | LogLevel[] | false) {
    Logger.overrideLogger(logger);

    if (this.shouldFlushLogsOnOverride) this.flushLogs();
  }

  public useGlobalFilters(...filters: ExceptionFilter[]): this {
    this.config.useGlobalFilters(...filters);
    return this;
  }

  public useGlobalPipes(...pipes: PipeTransform<any>[]): this {
    this.config.useGlobalPipes(...pipes);
    return this;
  }

  public useGlobalInterceptors(...interceptors: VenokInterceptor[]): this {
    this.config.useGlobalInterceptors(...interceptors);
    return this;
  }

  public useGlobalGuards(...guards: CanActivate[]): this {
    this.config.useGlobalGuards(...guards);
    return this;
  }

  /**
   * Prints buffered logs and detaches buffer.
   * @returns {void}
   */
  public flushLogs() {
    Logger.flush();
  }

  /**
   * Define that it must flush logs right after defining a custom logger.
   */
  public flushLogsOnOverride() {
    this.shouldFlushLogsOnOverride = true;
  }

  /**
   * Enables the usage of shutdown hooks. Will call the
   * `onApplicationShutdown` function of a provider if the
   * process receives a shutdown signal.
   *
   * @param {ShutdownSignal[]} [signals=[]] The system signals it should listen to
   *
   * @returns {this} The Venok application context instance
   */
  public enableShutdownHooks(signals: (ShutdownSignal | string)[] = []): this {
    if (isEmpty(signals)) {
      const keys = Object.keys(ShutdownSignal) as ShutdownSignalKeys[];
      signals = keys.map((key) => ShutdownSignal[key]);
    } else {
      // given signals array should be unique because
      // process shouldn't listen to the same signal more than once.
      signals = Array.from(new Set(signals));
    }

    signals = signals
      .map((signal: string) => signal.toString().toUpperCase().trim())
      // filter out the signals which is already listening to
      .filter((signal) => !this.activeShutdownSignals.includes(signal));

    this.listenToShutdownSignals(signals);
    return this;
  }

  protected async dispose(): Promise<void> {
    // Venok application context has no server
    // to dispose, therefore just call a noop
    return Promise.resolve();
  }

  /**
   * Listens to shutdown signals by listening to
   * process events
   *
   * @param {string[]} signals The system signals it should listen to
   */
  protected listenToShutdownSignals(signals: string[]) {
    let receivedSignal = false;
    const cleanup = async (signal: string) => {
      try {
        // If we receive another signal while we're waiting
        // for the server to stop, just ignore it.
        if (receivedSignal) return;

        receivedSignal = true;
        await this.initializationPromise;
        await this.callDestroyHook();
        await this.callBeforeShutdownHook(signal);
        await this.dispose();
        await this.callShutdownHook(signal);
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        signals.forEach((sig) => process.removeListener(sig, cleanup));
        process.kill(process.pid, signal);
      } catch (err) {
        Logger.error(MESSAGES.ERROR_DURING_SHUTDOWN, (err as Error)?.stack, ApplicationContext.name);
        process.exit(1);
      }
    };
    this.shutdownCleanupRef = cleanup as (...args: unknown[]) => unknown;

    signals.forEach((signal: string) => {
      this.activeShutdownSignals.push(signal);
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      process.on(signal, cleanup);
    });
  }

  /**
   * Unsubscribes from shutdown signals (process events)
   */
  protected unsubscribeFromProcessSignals() {
    if (!this.shutdownCleanupRef) return;

    this.activeShutdownSignals.forEach((signal) => {
      // @ts-expect-error Mismatch types
      process.removeListener(signal, this.shutdownCleanupRef);
    });
  }

  /**
   * Calls the `onModuleInit` function on the registered
   * modules and its children.
   */
  protected async callInitHook(): Promise<void> {
    const modulesSortedByDistance = this.getModulesToTriggerHooksOn();
    for (const module of modulesSortedByDistance) {
      await callModuleInitHook(module);
    }
  }

  /**
   * Calls the `onModuleDestroy` function on the registered
   * modules and its children.
   */
  protected async callDestroyHook(): Promise<void> {
    const modulesSortedByDistance = [...this.getModulesToTriggerHooksOn()].reverse();
    for (const module of modulesSortedByDistance) {
      await callModuleDestroyHook(module);
    }
  }

  /**
   * Calls the `onApplicationBootstrap` function on the registered
   * modules and its children.
   */
  protected async callBootstrapHook(): Promise<void> {
    const modulesSortedByDistance = this.getModulesToTriggerHooksOn();
    for (const module of modulesSortedByDistance) {
      await callModuleBootstrapHook(module);
    }
  }

  /**
   * Calls the `onApplicationShutdown` function on the registered
   * modules and children.
   */
  protected async callShutdownHook(signal?: string): Promise<void> {
    const modulesSortedByDistance = [...this.getModulesToTriggerHooksOn()].reverse();
    for (const module of modulesSortedByDistance) {
      await callAppShutdownHook(module, signal);
    }
  }

  /**
   * Calls the `beforeApplicationShutdown` function on the registered
   * modules and children.
   */
  protected async callBeforeShutdownHook(signal?: string): Promise<void> {
    const modulesSortedByDistance = [...this.getModulesToTriggerHooksOn()].reverse();
    for (const module of modulesSortedByDistance) {
      await callBeforeAppShutdownHook(module, signal);
    }
  }

  protected assertNotInPreviewMode(methodName: string) {
    if (this.appOptions.preview) {
      const error = `Calling the "${methodName}" in the preview mode is not supported.`;
      this.logger.error(error);
      throw new Error(error);
    }
  }

  private getModulesToTriggerHooksOn(): Module[] {
    if (this._moduleRefsForHooksByDistance) {
      return this._moduleRefsForHooksByDistance;
    }
    const modulesContainer = this.container.getModules();
    const compareFn = (a: Module, b: Module) => b.distance - a.distance;
    const modulesSortedByDistance = Array.from(modulesContainer.values()).sort(compareFn);

    this._moduleRefsForHooksByDistance = this.appOptions?.preview
      ? modulesSortedByDistance.filter((moduleRef) => moduleRef.initOnPreview)
      : modulesSortedByDistance;
    return this._moduleRefsForHooksByDistance;
  }

  private printInPreviewModeWarning() {
    this.logger.warn("------------------------------------------------");
    this.logger.warn("Application is running in the PREVIEW mode!");
    this.logger.warn("Providers will not be instantiated.");
    this.logger.warn("------------------------------------------------");
  }
}
