import type { InjectionToken } from "@venok/core";

import { Injector, InstanceWrapper, Module, STATIC_CONTEXT } from "@venok/core/injector/index.js";
import { isUndefined } from "@venok/core/helpers/index.js";

import { MiddlewareContainer } from "@venok/integration/middleware/container.js";

export class MiddlewareResolver {
  constructor(
    private readonly middlewareContainer: MiddlewareContainer,
    private readonly injector: Injector,
  ) {}

  public async resolveInstances(moduleRef: Module, moduleName: string) {
    const middlewareMap = this.middlewareContainer.getMiddlewareCollection(moduleName);
    const resolveInstance = async (wrapper: InstanceWrapper) =>
      this.resolveMiddlewareInstance(wrapper, middlewareMap, moduleRef);
    await Promise.all([...middlewareMap.values()].map(resolveInstance));
  }

  private async resolveMiddlewareInstance(
    wrapper: InstanceWrapper,
    middlewareMap: Map<InjectionToken, InstanceWrapper>,
    moduleRef: Module,
  ) {
    const { metatype, token } = wrapper;
    const targetWrapper = middlewareMap.get(token);

    if (!targetWrapper || !isUndefined(targetWrapper.instance)) return;

    targetWrapper.instance = Object.create(metatype!.prototype);

    await this.injector.loadInstance(wrapper, middlewareMap, moduleRef, STATIC_CONTEXT, wrapper);
  }
}
