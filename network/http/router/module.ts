import { DynamicModule, Inject, Module, MODULE_PATH, Type } from "@venok/core";
import { ModulesContainer, Module as ModuleClass } from "@venok/core/injector";

import { Routes, RouteTree } from "@venok/http";
import { flattenRoutePaths, normalizePath } from "@venok/http/helpers";

export const ROUTES = Symbol("ROUTES");

export const targetModulesByContainer = new WeakMap<ModulesContainer, WeakSet<ModuleClass>>();

/**
 * @publicApi
 */
@Module({})
export class RouterModule {
  constructor(
    private readonly modulesContainer: ModulesContainer,
    @Inject(ROUTES) private readonly routes: Routes,
  ) {
    this.routes = this.deepCloneRoutes(routes) as Routes;
    this.initialize();
  }

  static register(routes: Routes): DynamicModule {
    return {
      module: RouterModule,
      providers: [
        {
          provide: ROUTES,
          useValue: routes,
        },
      ],
    };
  }

  private deepCloneRoutes(routes: Routes | Type[]): Routes | Array<Type> {
    return routes.map((routeOrType: Type | RouteTree) => {
      if (typeof routeOrType === "function") return routeOrType;

      if (routeOrType.children) {
        return {
          ...routeOrType,
          children: this.deepCloneRoutes(routeOrType.children),
        };
      }
      return { ...routeOrType };
    }) as Routes | Array<Type>;
  }

  private initialize() {
    const flattenedRoutes = flattenRoutePaths(this.routes);
    flattenedRoutes.forEach((route) => {
      const modulePath = normalizePath(route.path);
      this.registerModulePathMetadata(route.module, modulePath);
      this.updateTargetModulesCache(route.module);
    });
  }

  private registerModulePathMetadata(moduleCtor: Type, modulePath: string) {
    Reflect.defineMetadata(MODULE_PATH + this.modulesContainer.applicationId, modulePath, moduleCtor);
  }

  private updateTargetModulesCache(moduleCtor: Type) {
    let moduleClassSet: WeakSet<ModuleClass>;
    if (targetModulesByContainer.has(this.modulesContainer)) {
      moduleClassSet = targetModulesByContainer.get(this.modulesContainer) as WeakSet<ModuleClass>;
    } else {
      moduleClassSet = new WeakSet<ModuleClass>();
      targetModulesByContainer.set(this.modulesContainer, moduleClassSet);
    }
    const moduleRef = Array.from(this.modulesContainer.values()).find((item) => item?.metatype === moduleCtor);
    if (!moduleRef) return;

    moduleClassSet.add(moduleRef);
  }
}
