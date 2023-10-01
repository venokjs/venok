import { expect } from "chai";
import { Routes } from "../../interfaces";
import { RouterModule, ROUTES, targetModulesByContainer } from "../../router/module";
import { Module } from "@venok/core/injector/module/module";
import { ModulesContainer, VenokContainer } from "@venok/core";

class TestModuleClass {}

describe("RouterModule", () => {
  const routes: Routes = [{ path: "test", module: TestModuleClass }];

  describe("register", () => {
    it("should return a dynamic module with routes registered as a provider", () => {
      expect(RouterModule.register(routes)).to.deep.equal({
        module: RouterModule,
        providers: [
          {
            provide: ROUTES,
            useValue: routes,
          },
        ],
      });
    });
  });
  describe("when instantiated", () => {
    it('should update the "targetModulesByContainer" weak map', () => {
      const moduleRef = new Module(TestModuleClass, new VenokContainer(null as any));
      const container = new ModulesContainer([[TestModuleClass.name, moduleRef]]);

      new RouterModule(container, routes);

      class NotRegisteredModuleClass {}

      new RouterModule(container, [
        {
          path: "random",
          module: NotRegisteredModuleClass,
        },
      ]);

      expect(targetModulesByContainer.get(container)!.has(moduleRef)).to.be.true;
    });
  });
});
