import { MetadataScanner, Module } from "@venok/core";
import { DiscoveryService } from "@venok/integration/services/discovery.service";

/**
 * @publicApi
 */
@Module({
  providers: [MetadataScanner, DiscoveryService],
  exports: [MetadataScanner, DiscoveryService],
})
export class IntegrationModule {}
