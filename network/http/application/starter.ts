import { ApplicationConfig, VenokContainer } from "@venok/core";
import { Injector } from "@venok/core/injector/injector";
import { isFunction, isString } from "@venok/core/helpers/shared.helper";
import { platform } from "os";
import { addLeadingSlash, VENOK_HTTP_SERVER_START } from "../helpers";
import { Logger } from "@venok/core/services/logger.service";
import { MiddlewareContainer } from "../middleware/container";
import { MiddlewareModule } from "../middleware/module";
import { RoutesResolver } from "../router/resolver";
import { HttpServer } from "../interfaces";
import { HttpConfig } from "./config";
import { GraphInspector } from "@venok/core/inspector/graph-inspector";

/**
 * @publicApi
 */
export class HttpStarter {
  private readonly injector: Injector;

  protected readonly logger = new Logger(HttpStarter.name, {
    timestamp: true,
  });
  private readonly middlewareModule: MiddlewareModule;
  private readonly middlewareContainer;
  private readonly routesResolver: RoutesResolver;
  private httpServer: any;
  private isListening = false;

  constructor(
    private readonly container: VenokContainer,
    private readonly httpAdapter: HttpServer,
    private readonly config: ApplicationConfig,
    private readonly httpConfig: HttpConfig,
    private readonly graphInspector: GraphInspector,
    private readonly appOptions: any = {},
  ) {
    this.registerHttpServer();
    this.middlewareContainer = new MiddlewareContainer(this.container);
    this.injector = new Injector({ preview: this.appOptions.preview });
    this.middlewareModule = new MiddlewareModule();
    this.routesResolver = new RoutesResolver(
      this.container,
      this.config,
      this.httpConfig,
      this.injector,
      this.graphInspector,
    );
  }

  public async dispose(): Promise<void> {
    this.httpAdapter && (await this.httpAdapter.close());
  }

  public registerHttpServer() {
    this.httpServer = this.createServer();
  }

  public getUnderlyingHttpServer<T>(): T {
    return this.httpAdapter.getHttpServer();
  }

  public createServer<T = any>(): T {
    this.httpAdapter.initHttpServer(this.appOptions);
    return this.httpAdapter.getHttpServer() as T;
  }

  public async registerModules() {
    await this.middlewareModule.register(
      this.middlewareContainer,
      this.container,
      this.config,
      this.httpConfig,
      this.injector,
      this.httpAdapter,
      this.graphInspector,
      this.appOptions,
    );
  }

  public async init(): Promise<this> {
    this.httpAdapter.init && (await this.httpAdapter.init());

    const useBodyParser = this.appOptions && this.appOptions.bodyParser !== false;
    useBodyParser && this.registerParserMiddleware();

    await this.registerModules();
    await this.registerRouter();
    await this.registerRouterHooks();
    return this;
  }

  public registerParserMiddleware() {
    const prefix = this.httpConfig.getGlobalPrefix();
    const rawBody = !!this.appOptions?.rawBody;
    this.httpAdapter.registerParserMiddleware(prefix, rawBody);
  }

  public async registerRouter() {
    await this.registerMiddleware(this.httpAdapter);

    const prefix = this.httpConfig.getGlobalPrefix();
    const basePath = addLeadingSlash(prefix);
    this.routesResolver.resolve(this.httpAdapter, basePath);
  }

  public async registerRouterHooks() {
    this.routesResolver.registerNotFoundHandler();
    this.routesResolver.registerExceptionHandler();
  }

  public getHttpServer() {
    return this.httpServer;
  }

  public async listen(port: number | string): Promise<any>;
  public async listen(port: number | string, hostname: string): Promise<any>;
  public async listen(port: number | string, ...args: any[]): Promise<any> {
    await this.init();

    return new Promise((resolve, reject) => {
      const errorHandler = (e: any) => {
        this.logger.error(e?.toString?.());
        reject(e);
      };
      this.httpServer.once("error", errorHandler);

      const isCallbackInOriginalArgs = isFunction(args[args.length - 1]);
      const listenFnArgs = isCallbackInOriginalArgs ? args.slice(0, args.length - 1) : args;

      this.httpAdapter.listen(port, ...listenFnArgs, (...originalCallbackArgs: unknown[]) => {
        if (originalCallbackArgs[0] instanceof Error) return reject(originalCallbackArgs[0]);

        const address = this.httpServer.address();

        if (address) {
          this.httpServer.removeListener("error", errorHandler);
          this.isListening = true;
          resolve(this.httpServer);
        }
        if (isCallbackInOriginalArgs) {
          args[args.length - 1](...originalCallbackArgs);
        }

        this.logger.log(VENOK_HTTP_SERVER_START(port));
      });
    });
  }

  public async getUrl(): Promise<string> {
    return new Promise((resolve, reject) => {
      const address = this.httpServer.address();
      resolve(this.formatAddress(address));
    });
  }

  private formatAddress(address: any): string {
    if (isString(address)) {
      if (platform() === "win32") return address;

      const basePath = encodeURIComponent(address);
      return `${this.getProtocol()}+unix://${basePath}`;
    }

    let host = this.host();
    if (address && address.family === "IPv6") {
      if (host === "::") host = "[::1]";
      else host = `[${host}]`;
    } else if (host === "0.0.0.0") {
      host = "127.0.0.1";
    }

    return `${this.getProtocol()}://${host}:${address.port}`;
  }

  private host(): string | undefined {
    const address = this.httpServer.address();
    if (isString(address)) return undefined;

    return address && address.address;
  }

  private getProtocol(): "http" | "https" {
    return this.appOptions && this.appOptions.httpsOptions ? "https" : "http";
  }

  private async registerMiddleware(instance: any) {
    await this.middlewareModule.registerMiddleware(this.middlewareContainer, instance);
  }
}
