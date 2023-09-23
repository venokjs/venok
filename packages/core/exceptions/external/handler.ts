import { ExternalExceptionFilter } from "@venok/core/exceptions/external/filter";
import { ArgumentsHost } from "@venok/core/interfaces/context/arguments-host.interface";
import { InvalidExceptionFilterException } from "@venok/core/errors/exceptions/invalid-exception-filter.exception";
import { isEmpty } from "@venok/core/utils/shared.utils";
import { ExceptionFilterMetadata } from "@venok/core/interfaces/features/exception-filter.interface";
import { selectExceptionFilterMetadata } from "@venok/core/exceptions/select-exception-filter-metadata";

export class ExternalExceptionsHandler extends ExternalExceptionFilter {
  private filters: ExceptionFilterMetadata[] = [];

  public next(exception: Error | any, host: ArgumentsHost) {
    const result = this.invokeCustomFilters(exception, host);

    if (result) return result;

    return super.catch(exception, host);
  }

  public setCustomFilters(filters: ExceptionFilterMetadata[]) {
    if (!Array.isArray(filters)) throw new InvalidExceptionFilterException();

    this.filters = filters;
  }

  public invokeCustomFilters<T = any>(exception: T, host: ArgumentsHost): Promise<any> | null {
    if (isEmpty(this.filters)) return null;

    const filter = selectExceptionFilterMetadata(this.filters, exception);
    return filter ? filter.func(exception, host) : null;
  }
}
