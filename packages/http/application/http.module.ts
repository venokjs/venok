import { HttpConfigurableModuleClass } from "./http.module-defenition";
import { Module } from "@venok/core";
import { DiscoveryModule } from "@venok/core/discovery/module";
import { HttpCoreService } from "./http.service";

@Module({
  providers: [DiscoveryModule, HttpCoreService],
})
export class HttpModule extends HttpConfigurableModuleClass {}
