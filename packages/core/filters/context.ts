import {
  ApplicationConfig,
  EXCEPTION_FILTERS_METADATA,
  ExceptionFilter,
  ExceptionFilterMetadata,
  VenokContainer,
} from "@venok/core";
import { ExceptionFilterContextCreator } from "@venok/core/filters/context-creator";
import { InstanceWrapper, STATIC_CONTEXT } from "@venok/core/injector";
import { VenokExceptionFilter } from "@venok/core/filters/filter";
import { VenokExceptionsHandler } from "@venok/core/exceptions";
import { isEmpty } from "@venok/core/helpers";

export class VenokExceptionFilterContext extends ExceptionFilterContextCreator {
  constructor(
    container: VenokContainer,
    private readonly config?: ApplicationConfig,
  ) {
    super(container);
  }

  public create(
    instance: object,
    callback: (...args: any) => void,
    module: string,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): VenokExceptionsHandler {
    this.moduleContext = module;

    const exceptionHandler = new VenokExceptionsHandler(this.getExceptionFilter());
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

  public getExceptionFilter(): ExceptionFilter {
    return new VenokExceptionFilter();
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
