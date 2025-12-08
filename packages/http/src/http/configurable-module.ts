import type { HttpAppOptions } from "~/interfaces/index.js";

import { ConfigurableModuleBuilder } from "@venok/integration";

export const {
  ConfigurableModuleClass: HttpConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN: HTTP_APP_OPTIONS,
} = new ConfigurableModuleBuilder<HttpAppOptions>().build();