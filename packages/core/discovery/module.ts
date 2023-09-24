import { MetadataScanner } from "@venok/core/metadata-scanner";
import { Module } from "@venok/core/decorators/module.decorator";
import { DiscoveryService } from "@venok/core/discovery/service";

/**
 * @publicApi
 */
@Module({
  providers: [MetadataScanner, DiscoveryService],
  exports: [MetadataScanner, DiscoveryService],
})
export class DiscoveryModule {}
