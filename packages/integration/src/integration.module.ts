import { MetadataScanner, Module } from "@venok/core";

import { DiscoveryService } from "~/services/discovery.service.js";

/**
 * @publicApi
 */
@Module({
  providers: [MetadataScanner, DiscoveryService],
  exports: [MetadataScanner, DiscoveryService],
})
export class IntegrationModule {}
