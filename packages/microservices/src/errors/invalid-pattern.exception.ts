import { RuntimeException } from "@venok/core";

/**
 * @publicApi
 */
export class InvalidPatternException extends RuntimeException {
  constructor() {
    super(`The invalid data or message pattern (undefined/null)`);
  }
}