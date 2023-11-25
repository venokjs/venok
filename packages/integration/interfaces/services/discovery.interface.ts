/**
 * @publicApi
 */
export interface FilterByInclude {
  /**
   * List of modules to include (whitelist) into the discovery process.
   */
  include?: Function[];
}

/**
 * @publicApi
 */
export interface FilterByMetadataKey {
  /**
   * A key to filter controllers and providers by.
   * Only instance wrappers with the specified metadata key will be returned.
   */
  metadataKey?: string;
}

/**
 * @publicApi
 */
export type DiscoveryOptions = FilterByInclude | FilterByMetadataKey;
