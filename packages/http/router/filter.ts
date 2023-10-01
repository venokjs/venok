import { ApplicationConfig, VenokContainer } from "@venok/core";
import { BaseExceptionFilterContext } from "@venok/core/exceptions/filter-context";
import { RouterProxyCallback } from "../exceptions/proxy";
import { STATIC_CONTEXT } from "@venok/core/injector/constants";
import { InstanceWrapper } from "@venok/core/injector/instance/wrapper";
import { EXCEPTION_FILTERS_METADATA } from "@venok/core/constants";
import { isEmpty } from "@venok/core/helpers/shared.helper";
import { HttpServer } from "../interfaces";
import { HttpExceptionsHandler } from "../exceptions/handler";
import { HttpConfig } from "../application/config";

export class RouterExceptionFilters extends BaseExceptionFilterContext {
  constructor(
    container: VenokContainer,
    private readonly config: ApplicationConfig,
    private readonly httpConfig: HttpConfig,
    private readonly applicationRef: HttpServer,
  ) {
    super(container);
  }

  public create(
    instance: Object,
    callback: RouterProxyCallback,
    moduleKey: string,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): HttpExceptionsHandler {
    this.moduleContext = moduleKey;

    const exceptionHandler = new HttpExceptionsHandler(this.applicationRef);
    const filters = this.createContext(instance, callback, EXCEPTION_FILTERS_METADATA, contextId, inquirerId);
    if (isEmpty(filters)) return exceptionHandler;

    exceptionHandler.setCustomFilters(filters.reverse());
    return exceptionHandler;
  }

  public getGlobalMetadata<T extends unknown[]>(contextId = STATIC_CONTEXT, inquirerId?: string): T {
    const globalFilters = this.config.getGlobalFilters() as T;
    if (contextId === STATIC_CONTEXT && !inquirerId) {
      return globalFilters;
    }
    const scopedFilterWrappers = this.config.getGlobalRequestFilters() as InstanceWrapper[];
    const scopedFilters = scopedFilterWrappers
      .map((wrapper) => wrapper.getInstanceByContextId(contextId, inquirerId))
      .filter(Boolean)
      .map((host) => host.instance);

    return globalFilters.concat(scopedFilters) as T;
  }
}
