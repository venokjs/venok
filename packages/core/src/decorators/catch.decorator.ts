import type { Abstract, Type } from "~/interfaces/index.js";

import { CATCH_WATERMARK, FILTER_CATCH_EXCEPTIONS } from "~/constants.js";

/**
 * Decorator that marks a class as a Venok exception filter. An exception filter
 * handles exceptions thrown by or not handled by your application code.
 *
 * The decorated class must implement the `ExceptionFilter` interface.
 *
 * @param exceptions one or more exception *types* specifying
 * the exceptions to be caught and handled by this filter.
 *
 * @usageNotes
 * Exception filters are applied using the `@UseFilters()` decorator, or (globally)
 * with `app.useGlobalFilters()`.
 *
 * @publicApi
 */
export function Catch(...exceptions: Array<Type | Abstract<any>>): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(CATCH_WATERMARK, true, target);
    Reflect.defineMetadata(FILTER_CATCH_EXCEPTIONS, exceptions, target);
  };
}
