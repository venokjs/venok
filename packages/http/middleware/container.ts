import { InjectionToken, Type, VenokContainer } from "@venok/core";
import { InstanceWrapper } from "@venok/core/injector/instance/wrapper";
import { MiddlewareConfiguration } from "../interfaces/middleware";
import { getClassScope } from "@venok/core/injector/helpers/class-scope.helper";
import { isDurable } from "@venok/core/injector/helpers/is-durable.helper";
import { Injectable } from "@venok/core/interfaces/injectable.interface";

export class MiddlewareContainer {
  private readonly middleware = new Map<string, Map<InjectionToken, InstanceWrapper>>();
  private readonly configurationSets = new Map<string, Set<MiddlewareConfiguration>>();

  constructor(private readonly container: VenokContainer) {}

  public getMiddlewareCollection(moduleKey: string): Map<InjectionToken, InstanceWrapper> {
    if (!this.middleware.has(moduleKey)) {
      const moduleRef = this.container.getModuleByKey(moduleKey);
      // Global change
      this.middleware.set(moduleKey, new Map<InjectionToken, InstanceWrapper<Injectable>>());
    }
    return this.middleware.get(moduleKey) as Map<InjectionToken, InstanceWrapper>;
  }

  public getConfigurations(): Map<string, Set<MiddlewareConfiguration>> {
    return this.configurationSets;
  }

  public insertConfig(configList: MiddlewareConfiguration[], moduleKey: string) {
    const middleware = this.getMiddlewareCollection(moduleKey);
    const targetConfig = this.getTargetConfig(moduleKey);

    const configurations = configList || [];
    const insertMiddleware = <T extends Type<unknown>>(metatype: T) => {
      const token = metatype;
      middleware.set(
        token,
        new InstanceWrapper({
          scope: getClassScope(metatype),
          durable: isDurable(metatype),
          name: token?.name ?? token,
          metatype,
          token,
        }),
      );
    };
    configurations.forEach((config) => {
      [].concat(config.middleware).map(insertMiddleware);
      targetConfig.add(config);
    });
  }

  private getTargetConfig(moduleName: string) {
    if (!this.configurationSets.has(moduleName)) {
      this.configurationSets.set(moduleName, new Set<MiddlewareConfiguration>());
    }
    return this.configurationSets.get(moduleName) as Set<MiddlewareConfiguration<any>>;
  }
}
