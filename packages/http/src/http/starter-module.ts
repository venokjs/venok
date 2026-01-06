import type { OnApplicationBootstrap, OnApplicationShutdown, OnModuleInit } from "@venok/core";

import type { ControllerDiscovery } from "~/helpers/discovery.helper.js";
import type { AbstractHttpAdapter } from "~/http/adapter.js";
import type { HttpAppOptions } from "~/interfaces/index.js";

import { ApplicationConfig, Inject, Injectable, Logger, VenokContainer } from "@venok/core";

import {
  VENOK_ADAPTER_ADD_ROUTE,
  VENOK_ADAPTER_BUILD,
  VENOK_ADAPTER_SET_EXCEPTION_FILTER,
  VENOK_APPLY_ROUTES_TO_INSTANCE
} from "~/symbols.js";
import { HTTP_APP_OPTIONS } from "~/http/configurable-module.js";
import { HttpExplorerService } from "~/http/explorer.js";
import { HttpConfig } from "~/http/config.js";

import { HttpMiddlewareService } from "~/middleware/service.js";
import { HttpMiddlewareModule } from "~/middleware/module.js";

import { Controller } from "~/decorators/controller.decorator.js";

import { VENOK_HTTP_SERVER_START } from "~/helpers/messages.helper.js";

@Injectable()
export class HttpStarterModule<T extends HttpAppOptions = any> implements OnApplicationShutdown, OnApplicationBootstrap, OnModuleInit {
  private readonly logger = new Logger(HttpStarterModule.name, { timestamp: true });
  private adapter!: AbstractHttpAdapter;

  constructor(
    @Inject(HTTP_APP_OPTIONS) private readonly options: Required<T>,
    private readonly httpExplorerService: HttpExplorerService,
    private readonly middlewareService: HttpMiddlewareService,
    private readonly container: VenokContainer,
    private readonly httpConfig: HttpConfig
  ) {}

  public async onApplicationShutdown() {
    await this.adapter.close();
  }

  public async onApplicationBootstrap() {
    const routes = this.adapter[VENOK_ADAPTER_BUILD]();

    this.adapter[VENOK_APPLY_ROUTES_TO_INSTANCE](routes);

    this.adapter.registerNotFoundHandler();
    this.adapter.registerExceptionHandler();

    const listenCallback = async (...args: any[]) => {
      this.logger.log(VENOK_HTTP_SERVER_START(this.options.port));
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      if (this.options.listenCallback) await this.options.listenCallback(...args);
    };

    await this.adapter.listen(
      this.options.port,
      this.options.hostname || "",
      listenCallback
    );
  }

  public async onModuleInit() {
    this.adapter = this.httpConfig.getHttpAdapterRef();
    this.adapter[VENOK_ADAPTER_SET_EXCEPTION_FILTER](this.container, new ApplicationConfig());

    this.options.callback && this.options.callback(this.httpConfig);

    await this.middlewareService.explore(HttpMiddlewareModule);
    await this.middlewareService.build();

    this.httpExplorerService
      .explore(Controller.KEY)
      .forEach((item) => this.registerRoutes(item));
  }

  private registerRoutes(controllerDiscovery: ControllerDiscovery) {
    controllerDiscovery.getItems().forEach((item) => {
      const { path, ...metadata } = item.getMeta();
      this.adapter[VENOK_ADAPTER_ADD_ROUTE](path, metadata);
    });
  }
}