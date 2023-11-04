/**
 *
 * @publicApi
 */
export interface VenokMiddleware<TRequest = any, TResponse = any> {
  use(req: TRequest, res: TResponse, next: (error?: Error | any) => void): any;
}
