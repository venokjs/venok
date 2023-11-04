import { ApplicationConfig, Inject, Injectable, VenokContainer } from "@venok/core";
import { OnApplicationShutdown, OnModuleInit } from "@venok/core/interfaces/hooks";
import { HttpConfig } from "./config";
import { HttpStarter } from "./starter";
import { GraphInspector } from "@venok/core/inspector/graph-inspector";
import { HttpApplication } from "./application";
import { HTTP_APP_OPTIONS, HttpAppOptions } from "./http.module-defenition";

@Injectable()
export class HttpCoreService implements OnModuleInit, OnApplicationShutdown {
  private httpStarter!: HttpStarter;

  constructor(
    private readonly container: VenokContainer,
    @Inject(HTTP_APP_OPTIONS) private readonly options: Required<HttpAppOptions>,
  ) {}
  async onModuleInit(): Promise<any> {
    const httpConfig = new HttpConfig();

    httpConfig.setHttpAdapter(this.options.adapter);

    this.httpStarter = new HttpStarter(
      this.container,
      this.options.adapter,
      this.container.applicationConfig as ApplicationConfig,
      httpConfig,
      new GraphInspector(this.container),
    );

    this.options.callback && this.options.callback(new HttpApplication(this.options.adapter, httpConfig));

    await this.httpStarter.listen(this.options.port);
  }

  async onApplicationShutdown(signal?: string) {
    await this.httpStarter.dispose();
  }
}
