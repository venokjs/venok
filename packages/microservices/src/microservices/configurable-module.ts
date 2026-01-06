import type { MicroserviceAppOptions } from "~/interfaces/index.js";

import { ConfigurableModuleBuilder } from "@venok/integration";

export const {
  ConfigurableModuleClass: MicroserviceConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN: MICROSERVICE_APP_OPTIONS,
} = new ConfigurableModuleBuilder<MicroserviceAppOptions>().build();