import type { Type } from "@venok/core/interfaces/index.js";
import type { ArgumentsHost } from "@venok/core/interfaces/context/arguments-host.interface.js";

/**
 * Interface describing implementation of an exception filter.
 *
 * @publicApi
 */
export interface ExceptionFilter<T = any> {
  /**
   * Method to implement a custom exception filter.
   *
   * @param exception the class of the exception being handled
   * @param host used to access an array of arguments for
   * the in-flight request
   */
  catch(exception: T, host: ArgumentsHost): any;
}

export interface ExceptionFilterMetadata {
  func: ExceptionFilter["catch"];
  exceptionMetatypes: Type[];
}
