import type { HttpExceptionOptions } from "~/interfaces/index.js";

import { HttpException } from "./http.exception.js";
import { HttpStatus } from "~/enums/status.enum.js";

/**
 * Defines an HTTP exception for *Method Not Allowed* type errors.
 *
 * @publicApi
 */
export class MethodNotAllowedException extends HttpException {
  /**
   * Instantiate a `MethodNotAllowedException` Exception.
   *
   * @example
   * `throw new MethodNotAllowedException()`
   *
   * @usageNotes
   * The HTTP response status code will be 405.
   * - The `info` argument defines JSON object or the message string.
   * - The `descriptionOrOptions` argument contains either a short description of
   *   the HTTP error or an options object used to provide an underlying error cause.
   *
   * By default, the JSON response body contains two properties:
   * - `statusCode`: this will be the value 405.
   * - `message`: the string `'Method Not Allowed'` by default;
   *    override this by supplying a string in the `descriptionOrOptions` parameter.
   *
   * If the parameter `info` is a string, the body will contain an
   * additional property, `message`.
   *
   * By default, `error` will contain a string with a short description of the HTTP error.
   * To override the entire JSON response body, pass an object instead.
   * Venok will serialize the object and return it as the JSON response body.
   *
   * @param info string or object describing the error condition.
   * @param descriptionOrOptions either a short description of the HTTP error or an options object used to provide an underlying error cause
   */
  constructor(
    info?: string | object,
    descriptionOrOptions: string | HttpExceptionOptions = "Method Not Allowed"
  ) {
    const { description, httpExceptionOptions } = HttpException.extractDescriptionAndOptionsFrom(descriptionOrOptions);

    super(
      HttpException.createBody(info, description, HttpStatus.METHOD_NOT_ALLOWED),
      HttpStatus.METHOD_NOT_ALLOWED,
      httpExceptionOptions
    );
  }
}
