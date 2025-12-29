import { IntegrationModule } from "@venok/integration";
import { Module } from "@venok/core";

import { WebsocketConfig } from "~/websocket/config.js";
import { WebsocketExplorerService } from "~/websocket/explorer.js";
import { WebsocketStarterModule } from "~/websocket/starter-module.js";
import { WebsocketConfigurableModuleClass } from "~/websocket/configurable-module.js";


@Module({
  imports: [IntegrationModule],
  providers: [WebsocketConfig, WebsocketExplorerService, WebsocketStarterModule],
})
export class WebsocketModule extends WebsocketConfigurableModuleClass {}
