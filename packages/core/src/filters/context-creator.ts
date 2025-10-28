import type { ExceptionFilter, Type } from "~/interfaces/index.js";

import { InstanceWrapper } from "~/injector/instance/wrapper.js";
import { STATIC_CONTEXT } from "~/injector/constants.js";
import { VenokContainer } from "~/injector/container.js";

import { isEmpty, isFunction } from "~/helpers/shared.helper.js";

import { ContextCreator } from "~/context/creator.js";

import { FILTER_CATCH_EXCEPTIONS } from "~/constants.js";

export class ExceptionFilterContextCreator extends ContextCreator {
  protected moduleContext!: string;

  constructor(protected readonly container: VenokContainer) {
    super();
  }

  public createConcreteContext<T extends any[], R extends any[]>(
    metadata: T,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): R {
    if (isEmpty(metadata)) return [] as any as R;

    return metadata
      .filter((instance) => instance && (isFunction(instance.catch) || instance.name))
      .map((filter) => this.getFilterInstance(filter, contextId, inquirerId))
      .filter(Boolean)
      .map((instance) => ({
        func: instance!.catch.bind(instance),
        exceptionMetatypes: this.reflectCatchExceptions(instance as any),
      })) as R;
  }

  public getFilterInstance(
    filter: Function | ExceptionFilter,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): ExceptionFilter | null {
    if ("catch" in filter) return filter as ExceptionFilter;

    const instanceWrapper = this.getInstanceByMetatype(filter as Type);
    if (!instanceWrapper) return null;

    const instanceHost = instanceWrapper.getInstanceByContextId(
      this.getContextId(contextId, instanceWrapper),
      inquirerId,
    );

    return instanceHost && instanceHost.instance;
  }

  public getInstanceByMetatype(metatype: Type): InstanceWrapper | undefined {
    if (!this.moduleContext) return;

    const collection = this.container.getModules();
    const moduleRef = collection.get(this.moduleContext);
    if (!moduleRef) return;

    return moduleRef.injectables.get(metatype);
  }

  public reflectCatchExceptions(instance: ExceptionFilter): Type[] {
    const prototype = Object.getPrototypeOf(instance);
    return Reflect.getMetadata(FILTER_CATCH_EXCEPTIONS, prototype.constructor) || [];
  }
}
