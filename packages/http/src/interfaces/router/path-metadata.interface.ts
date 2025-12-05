import type { VersioningOptions, VersionValue } from "~/interfaces/index.js";

export interface RoutePathMetadata {
  /**
   * Controller-level path (e.g., @Controller('resource') = "resource").
   */
  controllerPath?: string;

  /**
   * Method-level path (e.g., @Get('resource') = "resource").
   */
  methodPath?: string;

  /**
   * Global route prefix specified with the "VenokApplication#setGlobalPrefix" method.
   */
  globalPrefix?: string;

  /**
   * Module-level path registered through the "RouterModule".
   */
  modulePath?: string;

  /**
   * Controller-level version (e.g., @Controller({ version: '1.0' }) = "1.0").
   */
  controllerVersion?: VersionValue;

  /**
   * Method-level version (e.g., @Version('1.0') = "1.0").
   */
  methodVersion?: VersionValue;

  /**
   * API versioning options object.
   */
  versioningOptions?: VersioningOptions;
}
