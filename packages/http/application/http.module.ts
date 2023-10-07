import { Global, Module, Provider } from "@venok/core";
import { HttpApplication } from "./application";
import { HTTP_APP_OPTIONS } from "../constants";
import { HttpCoreAppService } from "./app.service";
import { DiscoveryModule } from "@venok/core/discovery/module";
import { HttpServer } from "../interfaces";

export interface HttpAppOptions {
  port: number;
  callback?: (app: HttpApplication) => void;
  adapter: HttpServer;
}

@Global()
@Module({
  providers: [DiscoveryModule],
})
export class HttpModule {
  static forRoot(options: HttpAppOptions): any {
    const OptionsProvider: Provider = {
      provide: HTTP_APP_OPTIONS,
      useValue: options,
    };

    return {
      module: HttpModule,
      providers: [OptionsProvider, HttpCoreAppService],
      exports: [HttpModule],
    };
  }
}
