export interface GetOrResolveOptions {
  /**
   * If enabled, lookup will only be performed in the host module.
   * @default false
   */
  strict?: boolean;
  /**
   * If enabled, instead of returning a first instance registered under a given token,
   * a list of instances will be returned.
   * @default false
   */
  each?: boolean;
}
