import { IntegrationModule } from "@venok/integration";
import { Module } from "@venok/core";

import { HttpConfigurableModuleClass } from "~/http/configurable-module.js";

import { HttpMiddlewareService } from "~/middleware/service.js";
import { HttpStarterModule } from "~/http/starter-module.js";
import { HttpExplorerService } from "~/http/explorer.js";
import { HttpConfig } from "~/http/config.js";

@Module({
  imports: [IntegrationModule],
  providers: [HttpConfig, HttpMiddlewareService, HttpExplorerService, HttpStarterModule],
})
export class HttpModule extends HttpConfigurableModuleClass {}
