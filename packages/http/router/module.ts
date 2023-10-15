import { DynamicModule, Inject, Module, ModulesContainer, Type } from "@venok/core";
import { Module as ModuleClass } from "@venok/core/injector/module/module";
import { normalizePath } from "../helpers";
import { MODULE_PATH } from "@venok/core/constants";
import { Routes, RouteTree } from "../interfaces";
import { flattenRoutePaths } from "../helpers";

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

  private deepCloneRoutes(routes: Routes | Type<any>[]): Routes | Array<Type<any>> {
    return routes.map((routeOrType: Type<any> | RouteTree) => {
      if (typeof routeOrType === "function") return routeOrType;

      if (routeOrType.children) {
        return {
          ...routeOrType,
          children: this.deepCloneRoutes(routeOrType.children),
        };
      }
      return { ...routeOrType };
    }) as Routes | Array<Type<any>>;
  }

  private initialize() {
    const flattenedRoutes = flattenRoutePaths(this.routes);
    flattenedRoutes.forEach((route) => {
      const modulePath = normalizePath(route.path);
      this.registerModulePathMetadata(route.module, modulePath);
      this.updateTargetModulesCache(route.module);
    });
  }

  private registerModulePathMetadata(moduleCtor: Type<unknown>, modulePath: string) {
    Reflect.defineMetadata(MODULE_PATH + this.modulesContainer.applicationId, modulePath, moduleCtor);
  }

  private updateTargetModulesCache(moduleCtor: Type<unknown>) {
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
