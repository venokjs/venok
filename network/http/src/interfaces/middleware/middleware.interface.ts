/**
 *
 * @publicApi
 */
export interface VenokMiddleware<TRequest = any, TResponse = any> {
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  use(req: TRequest, res: TResponse, next: (error?: Error | any) => void): any;
}
