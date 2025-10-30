import type { OnModuleInit } from "@venok/core";

import type { ControllerDiscovery } from "~/discovery/controller.discovery.js";

import { Inject, isFunction, Logger, Module, VenokContainer } from "@venok/core";

import { HttpConfig } from "~/application/config.js";
import { HTTP_APP_OPTIONS } from "~/application/http.module-defenition.js";
import { AdapterErrorsHelper } from "~/helpers/errors.helper.js";
import { RoutesExplorer } from "~/explorers/routes.explorer.js";
import { HttpApplication } from "~/application/application.js";
import { AbstractHttpAdapter } from "~/adapter/adapter.js";
import { RouterMethodFactory } from "~/factory/method.factory.js";
import { HttpMiddlewareModule } from "~/middleware/module.js";
import { Controller } from "~/decorators/controller.decorator.js";
import { HttpMiddlewareService } from "~/middleware/middleware.service.js";
import { VENOK_HTTP_SERVER_START } from "~/helpers/messages.helper.js";

export interface HttpAppOptions2 {
  port: number;
  callback: (app: HttpApplication) => void;
  adapter: AbstractHttpAdapter;
}

@Module({})
export class HttpStarterModule<T extends HttpAppOptions2 = any> implements OnModuleInit {
  private readonly logger = new Logger(HttpStarterModule.name, { timestamp: true });
  private readonly routerMethodFactory = new RouterMethodFactory();
  private httpAdapter!: AbstractHttpAdapter;
  private httpServer!: any;
  private isListening = false;

  constructor(
    private readonly routesExplorer: RoutesExplorer,
    private readonly httpConfig: HttpConfig,
    private readonly middlewareService: HttpMiddlewareService,
    @Inject(HTTP_APP_OPTIONS) private readonly options: Required<T>,
    private readonly container: VenokContainer
  ) {}

  async onModuleInit() {
    this.httpAdapter = this.httpConfig.getHttpAdapterRef();
    this.httpAdapter.initHttpServer({});
    this.httpServer = this.httpAdapter.getHttpServer();

    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this.options.callback && this.options.callback(new HttpApplication(this.options.adapter, this.httpConfig));

    await this.middlewareService.explore(HttpMiddlewareModule);
    await this.middlewareService.build();

    this.routesExplorer.explore(Controller.KEY).forEach((item) => this.registerRoutes(item));

    const adapterErrorsHelper = new AdapterErrorsHelper(this.container, this.httpConfig);

    adapterErrorsHelper.registerNotFoundHandler();
    adapterErrorsHelper.registerExceptionHandler();

    await this.listen(this.options.port);
  }

  private registerRoutes(controllerDiscovery: ControllerDiscovery) {
    controllerDiscovery.getItems().forEach((item) => {
      const methodRef = this.routerMethodFactory
        .get(this.httpConfig.getHttpAdapterRef(), item.getMethod())
        .bind(this.httpConfig.getHttpAdapterRef());
      methodRef(item.getPath(), item.getContextCallback());
    });
  }

  public async listen(port: number | string): Promise<any>;
  public async listen(port: number | string, hostname: string): Promise<any>;
  public async listen(port: number | string, ...args: any[]): Promise<any> {
    const isServerHasEmitter = "once" in this.httpServer || "on" in this.httpServer;

    return new Promise((resolve, reject) => {
      const errorHandler = (e: any) => {
        this.logger.error(e?.toString?.());
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        reject(e);
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      isServerHasEmitter && this.httpServer.once("error", errorHandler);

      const isCallbackInOriginalArgs = isFunction(args[args.length - 1]);
      const listenFnArgs = isCallbackInOriginalArgs ? args.slice(0, args.length - 1) : args;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      this.httpAdapter.listen(port, ...listenFnArgs, (...originalCallbackArgs: unknown[]) => {
        if (originalCallbackArgs[0] instanceof Error) return reject(originalCallbackArgs[0]);

        const address = this.httpServer.address();

        if (address) {
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          isServerHasEmitter && this.httpServer.removeListener("error", errorHandler);
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
}
