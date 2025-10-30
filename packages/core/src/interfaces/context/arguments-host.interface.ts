// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
export type ContextType = "native" | string;

/**
 * Provides methods for retrieving the arguments being passed to a handler.
 * Allows choosing the appropriate execution context to retrieve the arguments from.
 *
 * @publicApi
 */
export interface ArgumentsHost {
  /**
   * Returns the array of arguments being passed to the handler.
   */
  getArgs<T extends Array<any> = any[]>(): T;
  /**
   * Returns a particular argument by index.
   * @param index index of argument to retrieve
   */
  getArgByIndex<T = any>(index: number): T;
  /**
   * Returns the current execution context type (string)
   */
  getType<TContext extends string = ContextType>(): TContext;
}
