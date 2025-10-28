import type { ExceptionFilter } from "~/interfaces/index.js";

import { extendArrayMetadata } from "~/helpers/metadata.helper.js";
import { isFunction } from "~/helpers/shared.helper.js";
import { validateEach } from "~/helpers/validate-each.helper.js";

import { EXCEPTION_FILTERS_METADATA } from "~/constants.js";

/**
 * Decorator that binds exception filters to the scope of the controller or
 * method, depending on its context.
 *
 * When `@UseFilters` is used at the provider level, the filter will be
 * applied to every handler (method) in the provider.
 *
 * When `@UseFilters` is used at the individual handler level, the filter
 * will apply only to that specific method.
 *
 * @param filters exception filter instance or class, or a list of exception
 * filter instances or classes.
 *
 * @usageNotes
 * Exception filters can also be set up globally for all controllers and routes
 * using `app.useGlobalFilters()`.
 *
 * @publicApi
 */

export const UseFilters = (...filters: (ExceptionFilter | Function)[]) => addExceptionFiltersMetadata(...filters);

function addExceptionFiltersMetadata(...filters: (Function | ExceptionFilter)[]): MethodDecorator & ClassDecorator {
  return (target: any, key?: string | symbol, descriptor?: TypedPropertyDescriptor<any>) => {
    const isFilterValid = <T extends Function | Record<string, any>>(filter: T) =>
      filter && (isFunction(filter) || isFunction((filter as Record<string, any>).catch));

    if (descriptor) {
      validateEach(target.constructor, filters, isFilterValid, "@UseFilters", "filter");
      extendArrayMetadata(EXCEPTION_FILTERS_METADATA, filters, descriptor.value);
      return descriptor;
    }
    validateEach(target, filters, isFilterValid, "@UseFilters", "filter");
    extendArrayMetadata(EXCEPTION_FILTERS_METADATA, filters, target);
    return target;
  };
}
