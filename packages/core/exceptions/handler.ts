import { InvalidExceptionFilterException } from "@venok/core/errors/exceptions/invalid-exception-filter.exception";
import { isEmpty } from "@venok/core/helpers/shared.helper";
import { ArgumentsHost, ExceptionFilter, ExceptionFilterMetadata } from "@venok/core";

export class VenokExceptionsHandler {
  private filters: ExceptionFilterMetadata[] = [];

  constructor(private readonly exceptionsFilter: ExceptionFilter) {}

  public next(exception: Error | any, host: ArgumentsHost) {
    const result = this.invokeCustomFilters(exception, host);

    if (result) return result;

    return this.exceptionsFilter.catch(exception, host);
  }

  public setCustomFilters(filters: ExceptionFilterMetadata[]) {
    if (!Array.isArray(filters)) throw new InvalidExceptionFilterException();

    this.filters = filters;
  }

  public invokeCustomFilters<T = any>(exception: T, host: ArgumentsHost): boolean {
    if (isEmpty(this.filters)) return false;

    const filter = this.selectExceptionFilterMetadata(this.filters, exception);
    filter && filter.func(exception, host);
    return !!filter;
  }

  protected selectExceptionFilterMetadata<T = any>(
    filters: ExceptionFilterMetadata[],
    exception: T,
  ): ExceptionFilterMetadata | undefined {
    return filters.find(
      ({ exceptionMetatypes }) =>
        !exceptionMetatypes.length ||
        exceptionMetatypes.some((ExceptionMetaType) => exception instanceof ExceptionMetaType),
    );
  }
}
