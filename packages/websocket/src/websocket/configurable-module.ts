import type { WebsocketAppOptions } from "~/interfaces/index.js";

import { ConfigurableModuleBuilder } from "@venok/integration";

export const {
  ConfigurableModuleClass: WebsocketConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN: WEBSOCKET_APP_OPTIONS,
} = new ConfigurableModuleBuilder<WebsocketAppOptions>().build();