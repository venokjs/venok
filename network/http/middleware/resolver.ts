import { MiddlewareContainer } from "./container";
import { Injector } from "@venok/core/injector/injector";
import { Module } from "@venok/core/injector/module/module";
import { InstanceWrapper } from "@venok/core/injector/instance/wrapper";
import { InjectionToken } from "@venok/core";
import { isUndefined } from "@venok/core/helpers/shared.helper";
import { STATIC_CONTEXT } from "@venok/core/injector/constants";

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

    if (!targetWrapper) return;

    if (!isUndefined(targetWrapper.instance)) return;

    targetWrapper.instance = Object.create(metatype!.prototype);

    await this.injector.loadInstance(wrapper, middlewareMap, moduleRef, STATIC_CONTEXT, wrapper);
  }
}
