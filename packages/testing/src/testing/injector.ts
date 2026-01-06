import type { InjectorDependencyContext } from "@venok/core";

import type { MockFactory } from "~/interfaces/index.js";

import { CoreModule, Injector, InstanceWrapper, STATIC_CONTEXT, VenokContainer } from "@venok/core";


/**
 * @publicApi
 */
export class TestingInjector extends Injector {
  protected mocker?: MockFactory;
  protected container!: VenokContainer;

  public setMocker(mocker: MockFactory) {
    this.mocker = mocker;
  }

  public setContainer(container: VenokContainer) {
    this.container = container;
  }

  public async resolveComponentWrapper<T>(
    moduleRef: CoreModule,
    name: any,
    dependencyContext: InjectorDependencyContext,
    wrapper: InstanceWrapper<T>,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
    keyOrIndex?: string | number
  ): Promise<InstanceWrapper> {
    try {
      const existingProviderWrapper = await super.resolveComponentWrapper(
        moduleRef,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        name,
        dependencyContext,
        wrapper,
        contextId,
        inquirer,
        keyOrIndex
      );
      return existingProviderWrapper;
    } catch (err) {
      return this.mockWrapper(err, moduleRef, name, wrapper);
    }
  }

  public async resolveComponentHost<T>(
    moduleRef: CoreModule,
    instanceWrapper: InstanceWrapper<T>,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper
  ): Promise<InstanceWrapper> {
    try {
      const existingProviderWrapper = await super.resolveComponentHost(
        moduleRef,
        instanceWrapper,
        contextId,
        inquirer
      );
      return existingProviderWrapper;
    } catch (err) {
      return this.mockWrapper(err, moduleRef, instanceWrapper.name, instanceWrapper);
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  private async mockWrapper<T>(
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    err: Error | unknown,
    moduleRef: CoreModule,
    name: any,
    wrapper: InstanceWrapper<T>
  ): Promise<InstanceWrapper> {
    if (!this.mocker) throw err;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const mockedInstance = this.mocker(name);
    if (!mockedInstance) throw err;

    const newWrapper = new InstanceWrapper({
      name,
      isAlias: false,
      scope: wrapper.scope,
      instance: mockedInstance,
      isResolved: true,
      host: moduleRef,
      metatype: wrapper.metatype,
    });
    const internalCoreModule = this.container.getInternalCoreModuleRef();
    if (!internalCoreModule) throw new Error("Expected to have internal core module reference at this point.");

    internalCoreModule.addCustomProvider(
      { provide: name, useValue: mockedInstance },
      internalCoreModule.providers
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    internalCoreModule.addExportedProviderOrModule(name);
    return newWrapper;
  }
}