/**
 * Interface defining method to respond to system signals (when application gets
 * shutdown by, e.g., SIGTERM)
 *
 * @publicApi
 */
export interface OnApplicationShutdown {
  onApplicationShutdown(signal?: string): any;
}
