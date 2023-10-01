import { ExceptionFilterMetadata } from "@venok/core/interfaces/features/exception-filter.interface";
import { isEmpty } from "@venok/core/helpers/shared.helper";
import { selectExceptionFilterMetadata } from "@venok/core/exceptions/select-exception-filter-metadata";
import { InvalidExceptionFilterException } from "@venok/core/errors/exceptions/invalid-exception-filter.exception";
import { ArgumentsHost } from "@venok/core/interfaces/context/arguments-host.interface";
import { HttpExceptionFilter } from "@venok/http/exceptions/filter";
import { HttpException } from "../errors";

export class HttpExceptionsHandler extends HttpExceptionFilter {
  private filters: ExceptionFilterMetadata[] = [];

  public next(exception: Error | HttpException | any, ctx: ArgumentsHost) {
    if (this.invokeCustomFilters(exception, ctx)) return;

    super.catch(exception, ctx);
  }

  public setCustomFilters(filters: ExceptionFilterMetadata[]) {
    if (!Array.isArray(filters)) {
      throw new InvalidExceptionFilterException();
    }
    this.filters = filters;
  }

  public invokeCustomFilters<T = any>(exception: T, ctx: ArgumentsHost): boolean {
    if (isEmpty(this.filters)) {
      return false;
    }

    const filter = selectExceptionFilterMetadata(this.filters, exception);
    filter && filter.func(exception, ctx);
    return !!filter;
  }
}
