import { Type } from "../type.interface";
export type Transform<T = any> = (value: T, metadata: ArgumentMetadata) => any;

/**
 * Interface describing a pipe implementation's `transform()` method metadata argument.
 *
 * @publicApi
 */
export interface ArgumentMetadata {
  /**
   * Indicates whether custom parameter
   */
  readonly type: string;
  /**
   * Underlying base type (e.g., `String`) of the parameter, based on the type
   * definition in the route handler.
   */
  readonly metatype?: Type<any> | undefined;
  /**
   * String passed as an argument to the decorator.
   * Example: `@Body('userId')` would yield `userId`
   */
  readonly data?: string | undefined;
}

/**
 * Interface describing implementation of a pipe.
 *
 * @publicApi
 */
export interface PipeTransform<T = any, R = any> {
  /**
   * Method to implement a custom pipe.  Called with two parameters
   *
   * @param value argument before it is received by route handler method
   * @param metadata contains metadata about the value
   */
  transform(value: T, metadata: ArgumentMetadata): R;
}
