import { IntegrationModule } from "@venok/integration";
import { Module } from "@venok/core";

import { HttpConfig } from "~/application/config.js";
import { HttpMiddlewareService } from "~/middleware/middleware.service.js";
import { RoutesExplorer } from "~/explorers/routes.explorer.js";
import { HttpStarterModule } from "~/application/starter.module.js";
import { HttpConfigurableModuleClass } from "~/application/http.module-defenition.js";

@Module({
  imports: [IntegrationModule],
  // providers: [HttpConfig, HttpMiddlewareService, RoutesExplorer, HttpStarterModule],
  providers: [HttpConfig, HttpMiddlewareService, RoutesExplorer, HttpStarterModule],
})
export class HttpModule extends HttpConfigurableModuleClass {}
