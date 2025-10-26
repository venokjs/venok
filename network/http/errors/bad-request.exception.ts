import { HttpStatus } from "../enums/index.js";
import { HttpException } from "./http.exception.js";
import type { HttpExceptionOptions } from "./http.exception.js";

/**
 * Defines an HTTP exception for *Bad Request* type errors.
 *
 * @publicApi
 */
export class BadRequestException extends HttpException {
  /**
   * Instantiate a `BadRequestException` Exception.
   *
   * @example
   * `throw new BadRequestException()`
   *
   * @usageNotes
   * The HTTP response status code will be 400.
   * - The `objectOrError` argument defines the JSON response body or the message string.
   * - The `descriptionOrOptions` argument contains either a short description of the HTTP error or an options object used to provide an underlying error cause.
   *
   * By default, the JSON response body contains two properties:
   * - `statusCode`: this will be the value 400.
   * - `message`: the string `'Bad Request'` by default; override this by supplying
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
    objectOrError?: string | object | any,
    descriptionOrOptions: string | HttpExceptionOptions = "Bad Request",
  ) {
    const { description, httpExceptionOptions } = HttpException.extractDescriptionAndOptionsFrom(descriptionOrOptions);

    super(
      HttpException.createBody(objectOrError, description as any, HttpStatus.BAD_REQUEST),
      HttpStatus.BAD_REQUEST,
      httpExceptionOptions,
    );
  }
}
