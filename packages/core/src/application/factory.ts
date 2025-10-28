import {
  ApplicationContextOptions,
  type DynamicModule,
  type ForwardReference,
  type Type,
  type VenokApplicationContext,
} from "~/interfaces/index.js";

import { isFunction, isNull } from "~/helpers/shared.helper.js";
import { rethrow } from "~/helpers/rethrow.helper.js";
import { UuidFactory, UuidFactoryMode } from "~/helpers/uuid.helper.js";
import { ApplicationConfig } from "~/application/config.js";
import { ApplicationContext } from "~/application/context.js";
import { ConsoleLogger } from "~/services/console.service.js";
import { Logger } from "~/services/logger.service.js";

import { NoopGraphInspector } from "~/inspector/noop-graph-inspector.js";
import { GraphInspector } from "~/inspector/graph-inspector.js";

import { Injector } from "~/injector/injector.js";
import { VenokContainer } from "~/injector/container.js";
import { InstanceLoader } from "~/injector/instance/loader.js";

import { MetadataScanner } from "~/metadata-scanner.js";
import { DependenciesScanner } from "~/scanner.js";

import { ExceptionsZone } from "~/exceptions/zone/zone.js";
import { MESSAGES } from "~/constants.js";

/**
 * A valid Venok entry (or 'root') module reference.
 */
type IEntryVenokModule = Type<any> | DynamicModule | ForwardReference | Promise<IEntryVenokModule>;

/**
 * @publicApi
 */
export class VenokFactoryStatic {
  private readonly logger = new Logger("VenokFactory", {
    timestamp: true,
  });
  private abortOnError = true;
  private autoFlushLogs = false;

  /**
   * Creates an instance of VenokApplicationContext.
   *
   * @param moduleCls Entry (root) application module class
   * @param options Optional Venok application configuration
   *
   * @returns A promise that, when resolved,
   * contains a reference to the VenokApplicationContext instance.
   */
  public async createApplicationContext(
    moduleCls: IEntryVenokModule,
    options?: ApplicationContextOptions,
  ): Promise<VenokApplicationContext> {
    const applicationConfig = new ApplicationConfig();
    const container = new VenokContainer(applicationConfig);
    const graphInspector = this.createGraphInspector(options as any, container);

    this.setAbortOnError(options);
    this.registerLoggerConfiguration(options);

    await this.initialize(moduleCls, container, graphInspector, applicationConfig, options);

    const modules = container.getModules().values();
    const root = modules.next().value;

    const context = this.createVenokInstance<ApplicationContext>(
      new ApplicationContext(container, applicationConfig, options, root),
    );

    if (this.autoFlushLogs) context.flushLogsOnOverride();

    return context;
  }

  private createVenokInstance<T>(instance: T): T {
    return this.createProxy(instance);
  }

  private setAbortOnError(options?: ApplicationContextOptions) {
    this.abortOnError = !(options && options.abortOnError === false);
  }

  private async initialize(
    module: any,
    container: VenokContainer,
    graphInspector: GraphInspector,
    config = new ApplicationConfig(),
    options: ApplicationContextOptions = {},
  ) {
    UuidFactory.mode = options.snapshot ? UuidFactoryMode.Deterministic : UuidFactoryMode.Random;

    const injector = new Injector({ preview: options.preview as any });
    const instanceLoader = new InstanceLoader(container, injector, graphInspector);
    const metadataScanner = new MetadataScanner();
    const dependenciesScanner = new DependenciesScanner(container, metadataScanner, graphInspector, config);

    // Maybe Error
    const teardown = !this.abortOnError ? rethrow : undefined;

    try {
      this.logger.log(MESSAGES.APPLICATION_START);

      await ExceptionsZone.asyncRun(
        async () => {
          await dependenciesScanner.scan(module);
          await instanceLoader.createInstancesOfDependencies();
          dependenciesScanner.applyApplicationProviders();
        },
        teardown,
        this.autoFlushLogs,
      );
    } catch (e) {
      this.handleInitializationError(e);
    }
  }

  private handleInitializationError(err: unknown) {
    if (this.abortOnError) process.abort();

    rethrow(err);
  }

  private createProxy(target: any) {
    const proxy = this.createExceptionProxy();
    return new Proxy(target, { get: proxy, set: proxy });
  }

  private createExceptionProxy() {
    return (receiver: Record<string, any>, prop: string) => {
      if (!(prop in receiver)) return;

      if (isFunction(receiver[prop])) return this.createExceptionZone(receiver, prop);

      return receiver[prop];
    };
  }

  private createExceptionZone(receiver: Record<string, any>, prop: string): Function {
    // Maybe Error
    const teardown = !this.abortOnError ? rethrow : undefined;

    return (...args: unknown[]) => {
      let result: unknown;
      ExceptionsZone.run(() => {
        result = receiver[prop](...args);
      }, teardown);

      return result;
    };
  }

  private registerLoggerConfiguration(options: ApplicationContextOptions | undefined) {
    if (!options) return;

    const { logger, bufferLogs, autoFlushLogs, forceConsole } = options;

    if (!!logger && !isNull(logger)) Logger.overrideLogger(logger);
    else if (forceConsole) {
      // If no custom logger is provided but forceConsole is true,
      // create a ConsoleLogger with forceConsole option
      const consoleLogger = new ConsoleLogger({ forceConsole: true });
      Logger.overrideLogger(consoleLogger);
    }

    if (bufferLogs) Logger.attachBuffer();

    this.autoFlushLogs = autoFlushLogs ?? true;
  }

  private createGraphInspector(appOptions: ApplicationContextOptions, container: VenokContainer) {
    return appOptions?.snapshot ? new GraphInspector(container) : NoopGraphInspector;
  }
}

/**
 * Use VenokFactory to create an application instance.
 *
 * ### Specifying an entry module
 *
 * Pass the required *root module* for the application via the module parameter.
 * By convention, it is usually called `ApplicationModule`.  Starting with this
 * module, Venok assembles the dependency graph and begins the process of
 * Dependency Injection and instantiates the classes needed to launch your
 * application.
 *
 * @publicApi
 */
export const VenokFactory = new VenokFactoryStatic();
