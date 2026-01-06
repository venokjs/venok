import type { CoreModule } from "@venok/core";

import type { TestingInjector } from "~/testing/injector.js";
import type { MockFactory } from "~/interfaces/index.js";

import { InstanceLoader } from "@venok/core";

export class TestingInstanceLoader extends InstanceLoader<TestingInjector> {
  public async createInstancesOfDependencies(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    modules: Map<string, CoreModule> = this.container.getModules(),
    mocker?: MockFactory
  ): Promise<void> {
    this.injector.setContainer(this.container);
    mocker && this.injector.setMocker(mocker);
    await super.createInstancesOfDependencies();
  }
}