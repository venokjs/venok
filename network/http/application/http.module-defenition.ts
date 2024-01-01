import { ConfigurableModuleBuilder } from "@venok/integration";

import { HttpApplication } from "@venok/http/application/application";
import { AbstractHttpAdapter } from "@venok/http/adapter/adapter";

export interface HttpAppOptions {
  port: number;
  callback?: (app: HttpApplication) => void;
  adapter?: AbstractHttpAdapter;
}

export const { ConfigurableModuleClass: HttpConfigurableModuleClass, MODULE_OPTIONS_TOKEN: HTTP_APP_OPTIONS } =
  new ConfigurableModuleBuilder<HttpAppOptions>().build();
