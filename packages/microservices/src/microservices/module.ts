import { IntegrationModule } from "@venok/integration";
import { Module } from "@venok/core";

import { MicroserviceConfigurableModuleClass } from "~/microservices/configurable-module.js";
import { MicroserviceStarterModule } from "~/microservices/starter-module.js";
import { MicroserviceExplorerService } from "~/microservices/explorer.js";
import { MicroserviceConfig } from "~/microservices/config.js";


@Module({
  imports: [IntegrationModule],
  providers: [MicroserviceConfig, MicroserviceExplorerService, MicroserviceStarterModule],
})
export class WebsocketModule extends MicroserviceConfigurableModuleClass {}
