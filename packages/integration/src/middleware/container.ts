import type { InjectableToken, InjectionToken, Type } from "@venok/core";

import type { BaseMiddlewareConfiguration } from "~/interfaces/index.js";

import { getClassScope, InstanceWrapper, isDurable } from "@venok/core";

export class MiddlewareContainer {
  private readonly middleware = new Map<string, Map<InjectionToken, InstanceWrapper>>();
  private readonly configurationSets = new Map<string, Set<BaseMiddlewareConfiguration>>();

  public getMiddlewareCollection(moduleKey: string): Map<InjectionToken, InstanceWrapper> {
    if (!this.middleware.has(moduleKey)) {
      this.middleware.set(moduleKey, new Map<InjectionToken, InstanceWrapper<InjectableToken>>());
    }
    return this.middleware.get(moduleKey) as Map<InjectionToken, InstanceWrapper>;
  }

  public getConfigurations(): Map<string, Set<BaseMiddlewareConfiguration>> {
    return this.configurationSets;
  }

  public insertConfig(configList: BaseMiddlewareConfiguration[], moduleKey: string) {
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
        })
      );
    };
    configurations.forEach((config) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      [].concat(config.middleware).map(insertMiddleware);
      targetConfig.add(config);
    });
  }

  private getTargetConfig(moduleName: string) {
    if (!this.configurationSets.has(moduleName)) {
      this.configurationSets.set(moduleName, new Set<BaseMiddlewareConfiguration>());
    }
    return this.configurationSets.get(moduleName) as Set<BaseMiddlewareConfiguration>;
  }
}
