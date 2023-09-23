import { VenokContainer } from "@venok/core/injector/container";
import { ApplicationConfig } from "@venok/core/application/config";
import { BaseExceptionFilterContext } from "@venok/core/exceptions/filter-context";
import { STATIC_CONTEXT } from "@venok/core/injector/constants";
import { ExceptionFilterMetadata } from "@venok/core/interfaces/features/exception-filter.interface";
import { EXCEPTION_FILTERS_METADATA } from "@venok/core/constants";
import { isEmpty } from "@venok/core/utils/shared.utils";
import { InstanceWrapper } from "@venok/core/injector/instance/wrapper";
import { ExternalExceptionsHandler } from "@venok/core/exceptions/external/handler";

export class ExternalExceptionFilterContext extends BaseExceptionFilterContext {
  constructor(
    container: VenokContainer,
    private readonly config?: ApplicationConfig,
  ) {
    super(container);
  }

  public create(
    instance: object,
    callback: () => void,
    module: string,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): ExternalExceptionsHandler {
    this.moduleContext = module;

    const exceptionHandler = new ExternalExceptionsHandler();
    const filters = this.createContext<ExceptionFilterMetadata[]>(
      instance,
      callback,
      EXCEPTION_FILTERS_METADATA,
      contextId,
      inquirerId,
    );
    if (isEmpty(filters)) return exceptionHandler;

    exceptionHandler.setCustomFilters(filters.reverse());
    return exceptionHandler;
  }

  public getGlobalMetadata<T extends any[]>(contextId = STATIC_CONTEXT, inquirerId?: string): T {
    if (!this.config) return [] as any as T;

    const globalFilters = this.config.getGlobalFilters() as T;
    if (contextId === STATIC_CONTEXT && !inquirerId) return globalFilters;

    const scopedFilterWrappers = this.config.getGlobalRequestFilters() as InstanceWrapper[];
    const scopedFilters = scopedFilterWrappers
      .map((wrapper) => wrapper.getInstanceByContextId(contextId, inquirerId))
      .filter((host) => !!host)
      .map((host) => host.instance);

    return globalFilters.concat(scopedFilters) as T;
  }
}
