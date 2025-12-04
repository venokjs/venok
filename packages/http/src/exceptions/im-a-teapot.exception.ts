import type { HttpExceptionOptions } from "~/interfaces/index.js";

import { HttpException } from "./http.exception.js";
import { HttpStatus } from "~/enums/status.enum.js";

/**
 * Defines an HTTP exception for *I'm a teapot* type errors.
 *
 * @publicApi
 */
export class ImATeapotException extends HttpException {
  /**
   * Instantiate a `ImATeapotException` Exception.
   *
   * @example
   * `throw new ImATeapotException()`
   *
   * @usageNotes
   * The HTTP response status code will be 418.
   * - The `info` argument defines JSON object or the message string.
   * - The `descriptionOrOptions` argument contains either a short description of
   *   the HTTP error or an options object used to provide an underlying error cause.
   *
   * By default, the JSON response body contains two properties:
   * - `statusCode`: this will be the value 418.
   * - `message`: the string `'I'm a teapot'` by default;
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
    descriptionOrOptions: string | HttpExceptionOptions = "I'm a teapot"
  ) {
    const { description, httpExceptionOptions } = HttpException.extractDescriptionAndOptionsFrom(descriptionOrOptions);

    super(
      HttpException.createBody(info, description, HttpStatus.I_AM_A_TEAPOT),
      HttpStatus.I_AM_A_TEAPOT,
      httpExceptionOptions
    );
  }
}
