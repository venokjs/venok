import { IntegrationModule } from "@venok/integration";
import { Module } from "@venok/core";

import { HttpConfig } from "@venok/http/application/config";
import { HttpMiddlewareService } from "@venok/http/middleware";
import { RoutesExplorer } from "@venok/http/explorers/routes.explorer";
import { HttpStarterModule } from "@venok/http/application/starter.module";
import { HttpConfigurableModuleClass } from "@venok/http/application/http.module-defenition";

@Module({
  imports: [IntegrationModule],
  providers: [HttpConfig, HttpMiddlewareService, RoutesExplorer, HttpStarterModule],
  // providers: [HttpConfig, RoutesExplorer, HttpStarterModule],
})
export class HttpModule extends HttpConfigurableModuleClass {}
