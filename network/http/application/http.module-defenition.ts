import { HttpApplication } from "./application";
import { HttpServer } from "../interfaces";
import { ConfigurableModuleBuilder } from "@venok/core/module";
import { NoopHttpAdapter } from "../helpers";
import { AbstractHttpAdapter } from "../adapter/adapter";

export interface HttpAppOptions {
  port: number;
  callback?: (app: HttpApplication) => void;
  adapter?: AbstractHttpAdapter;
}

export const { ConfigurableModuleClass: HttpConfigurableModuleClass, MODULE_OPTIONS_TOKEN: HTTP_APP_OPTIONS } =
  new ConfigurableModuleBuilder<HttpAppOptions>().build();
