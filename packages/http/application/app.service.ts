import { ApplicationConfig, Inject, Injectable, VenokContainer } from "@venok/core";
import { BeforeApplicationShutdown, OnApplicationShutdown, OnModuleInit } from "@venok/core/interfaces/hooks";
import { HttpConfig } from "./config";
import { CoreModule } from "./core.module";
import { HTTP_APP_OPTIONS } from "../constants";
import { HttpAppOptions } from "./http.module";
import { GraphInspector } from "@venok/core/inspector/graph-inspector";
import { HttpApplication } from "./application";

@Injectable()
export class HttpCoreAppService implements OnModuleInit, OnApplicationShutdown {
  private httpServer!: CoreModule;

  constructor(
    private readonly container: VenokContainer,
    @Inject(HTTP_APP_OPTIONS) private readonly options: HttpAppOptions,
  ) {}
  async onModuleInit(): Promise<any> {
    console.log("TRY TO INIT");
    const httpConfig = new HttpConfig();

    // ONLY FOR TEST
    // const httpAdapter = new ExpressAdapter() as unknown as HttpServer;

    httpConfig.setHttpAdapter(this.options.adapter);

    this.httpServer = new CoreModule(
      this.container,
      this.options.adapter,
      this.container.applicationConfig as ApplicationConfig,
      httpConfig,
      new GraphInspector(this.container),
    );

    this.options.callback && this.options.callback(new HttpApplication(this.options.adapter, httpConfig));

    console.log("APP LISTEN");

    await this.httpServer.listen(this.options.port);

    console.log("APP LISTEN V2");
  }

  async onApplicationShutdown(signal?: string) {
    await this.httpServer.dispose();
  }
}
