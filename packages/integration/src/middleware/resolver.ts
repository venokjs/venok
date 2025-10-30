import type { CoreModule, InjectionToken } from "@venok/core";

import { Injector, InstanceWrapper, STATIC_CONTEXT, isUndefined } from "@venok/core";

import { MiddlewareContainer } from "~/middleware/container.js";

export class MiddlewareResolver {
  constructor(
    private readonly middlewareContainer: MiddlewareContainer,
    private readonly injector: Injector
  ) {}

  public async resolveInstances(moduleRef: CoreModule, moduleName: string) {
    const middlewareMap = this.middlewareContainer.getMiddlewareCollection(moduleName);
    const resolveInstance = async (wrapper: InstanceWrapper) =>
      this.resolveMiddlewareInstance(wrapper, middlewareMap, moduleRef);
    await Promise.all([...middlewareMap.values()].map(resolveInstance));
  }

  private async resolveMiddlewareInstance(
    wrapper: InstanceWrapper,
    middlewareMap: Map<InjectionToken, InstanceWrapper>,
    moduleRef: CoreModule
  ) {
    const { metatype, token } = wrapper;
    const targetWrapper = middlewareMap.get(token);

    if (!targetWrapper || !isUndefined(targetWrapper.instance)) return;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    targetWrapper.instance = Object.create(metatype!.prototype);

    await this.injector.loadInstance(wrapper, middlewareMap, moduleRef, STATIC_CONTEXT, wrapper);
  }
}
