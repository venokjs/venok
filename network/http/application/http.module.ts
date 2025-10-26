import { IntegrationModule } from "@venok/integration";
import { Module } from "@venok/core";

import { HttpConfig } from "@venok/http/application/config.js";
import { HttpMiddlewareService } from "@venok/http/middleware/index.js";
import { RoutesExplorer } from "@venok/http/explorers/routes.explorer.js";
import { HttpStarterModule } from "@venok/http/application/starter.module.js";
import { HttpConfigurableModuleClass } from "@venok/http/application/http.module-defenition.js";

@Module({
  imports: [IntegrationModule],
  // providers: [HttpConfig, HttpMiddlewareService, RoutesExplorer, HttpStarterModule],
  providers: [HttpConfig, HttpMiddlewareService, RoutesExplorer, HttpStarterModule],
})
export class HttpModule extends HttpConfigurableModuleClass {}
