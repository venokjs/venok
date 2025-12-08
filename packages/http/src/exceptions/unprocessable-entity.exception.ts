import type { HttpExceptionOptions } from "~/interfaces/index.js";

import { HttpException } from "./http.exception.js";
import { HttpStatus } from "~/enums/status.enum.js";

/**
 * Defines an HTTP exception for *Unprocessable Entity* type errors.
 *
 * @publicApi
 */
export class UnprocessableEntityException extends HttpException {
  /**
   * Instantiate a `UnprocessableEntityException` Exception.
   *
   * @example
   * `throw new UnprocessableEntityException()`
   *
   * @usageNotes
   * The HTTP response status code will be 422.
   * - The `info` argument defines JSON object or the message string.
   * - The `descriptionOrOptions` argument contains either a short description of
   *   the HTTP error or an options object used to provide an underlying error cause.
   *
   * By default, the JSON response body contains two properties:
   * - `statusCode`: this will be the value 422.
   * - `message`: the string `'Unprocessable Entity'` by default;
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
    descriptionOrOptions: string | HttpExceptionOptions = "Unprocessable Entity"
  ) {
    const { description, httpExceptionOptions } = HttpException.extractDescriptionAndOptionsFrom(descriptionOrOptions);

    super(
      HttpException.createBody(info, description, HttpStatus.UNPROCESSABLE_ENTITY),
      HttpStatus.UNPROCESSABLE_ENTITY,
      httpExceptionOptions
    );
  }
}
