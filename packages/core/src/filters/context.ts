import type { ExceptionFilter, ExceptionFilterMetadata } from "~/interfaces/index.js";

import { InstanceWrapper } from "~/injector/instance/wrapper.js";
import { STATIC_CONTEXT } from "~/injector/constants.js";
import { VenokContainer } from "~/injector/container.js";

import { ExceptionFilterContextCreator } from "~/filters/context-creator.js";
import { VenokExceptionFilter } from "~/filters/filter.js";

import { VenokExceptionsHandler } from "~/exceptions/handler.js";
import { isEmpty } from "~/helpers/shared.helper.js";

import { ApplicationConfig } from "~/application/config.js";

import { EXCEPTION_FILTERS_METADATA } from "~/constants.js";

export class VenokExceptionFilterContext extends ExceptionFilterContextCreator {
  constructor(
    container: VenokContainer,
    private readonly config?: ApplicationConfig
  ) {
    super(container);
  }

  public create(
    instance: object,
    callback: (...args: any) => void,
    module: string,
    contextId = STATIC_CONTEXT,
    inquirerId?: string
  ): VenokExceptionsHandler {
    this.moduleContext = module;

    const exceptionHandler = new VenokExceptionsHandler(this.getExceptionFilter());
    const filters = this.createContext<ExceptionFilterMetadata[]>(
      instance,
      callback,
      EXCEPTION_FILTERS_METADATA,
      contextId,
      inquirerId
    );

    if (isEmpty(filters)) return exceptionHandler;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
