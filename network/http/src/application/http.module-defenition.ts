import { ConfigurableModuleBuilder } from "@venok/integration";

// export interface HttpAppOptions {
//   port: number;
//   callback?: (app: HttpApplication) => void;
//   adapter?: AbstractHttpAdapter;
// }

// export interface HttpAppOptions {
//   port: number;
//   callback: (app: HttpApplication) => void;
//   adapter: AbstractHttpAdapter;
// }

declare global {
  export interface HttpAppOptions {
    port: number;
  }
}

// declare module "@venok/http" {
//   export interface HttpAppOptions {
//     port: number;
//     callback: (app: HttpApplication) => void;
//     adapter: AbstractHttpAdapter;
//   }
// }

export const { ConfigurableModuleClass: HttpConfigurableModuleClass, MODULE_OPTIONS_TOKEN: HTTP_APP_OPTIONS } =
  new ConfigurableModuleBuilder<HttpAppOptions>().build();
