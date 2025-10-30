import type { HttpExceptionOptions } from "./http.exception.js";

import { HttpException } from "./http.exception.js";
import { HttpStatus } from "../enums/http-status.enum.js";

/**
 * Defines an HTTP exception for *Gateway Timeout* type errors.
 *
 * @publicApi
 */
export class GatewayTimeoutException extends HttpException {
  /**
   * Instantiate a `GatewayTimeoutException` Exception.
   *
   * @example
   * `throw new GatewayTimeoutException()`
   *
   * @usageNotes
   * The HTTP response status code will be 504.
   * - The `objectOrError` argument defines the JSON response body or the message string.
   * - The `descriptionOrOptions` argument contains either a short description of the HTTP error or an options object used to provide an underlying error cause.
   *
   * By default, the JSON response body contains two properties:
   * - `statusCode`: this will be the value 504.
   * - `message`: the string `'Gateway Timeout'` by default; override this by supplying
   * a string in the `objectOrError` parameter.
   *
   * If the parameter `objectOrError` is a string, the response body will contain an
   * additional property, `error`, with a short description of the HTTP error. To override the
   * entire JSON response body, pass an object instead. Venok will serialize the object
   * and return it as the JSON response body.
   *
   * @param objectOrError string or object describing the error condition.
   * @param descriptionOrOptions either a short description of the HTTP error or an options object used to provide an underlying error cause
   */
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    objectOrError?: string | object | any,
    descriptionOrOptions: string | HttpExceptionOptions = "Gateway Timeout"
  ) {
    const { description, httpExceptionOptions } = HttpException.extractDescriptionAndOptionsFrom(descriptionOrOptions);

    super(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      HttpException.createBody(objectOrError, description as any, HttpStatus.GATEWAY_TIMEOUT),
      HttpStatus.GATEWAY_TIMEOUT,
      httpExceptionOptions
    );
  }
}
