import { beforeEach, describe, expect, it, spyOn } from "bun:test";

import { InstanceLoader } from "~/injector/instance/loader.js";
import { Injector } from "~/injector/injector.js";
import { GraphInspector } from "~/inspector/graph-inspector.js";
import { VenokContainer } from "~/injector/container.js";
import { Injectable } from "~/decorators/injectable.decorator.js";
import { InstanceWrapper } from "~/injector/instance/wrapper.js";

describe("InstanceLoader", () => {
  @Injectable()
  class TestProvider {}

  let loader: InstanceLoader;
  let injector: Injector;
  let container: VenokContainer;
  let graphInspector: GraphInspector;
  let inspectInstanceWrapperStub: any;
  let mockContainer: any;
  let moduleMock: Record<string, any>;

  beforeEach(() => {
    container = new VenokContainer();
    graphInspector = new GraphInspector(container);

    inspectInstanceWrapperStub = spyOn(
      graphInspector,
      "inspectInstanceWrapper"
    ).mockImplementation(() => {});

    injector = new Injector();
    loader = new InstanceLoader(container, injector, graphInspector);
    mockContainer = spyOn(container, "getModules");

    moduleMock = {
      imports: new Set(),
      providers: new Map(),
      controllers: new Map(),
      injectables: new Map(),
      exports: new Set(),
      metatype: { name: "test" },
    };

    const modules = new Map();
    modules.set("Test", moduleMock);
    mockContainer.mockReturnValue(modules);
  });

  it('should call "loadPrototype" for every provider and controller in every module', async () => {
    const providerWrapper = new InstanceWrapper({
      instance: null,
      metatype: TestProvider,
      token: "TestProvider",
    });

    moduleMock.providers.set("TestProvider", providerWrapper);
    const loadProviderPrototypeStub = spyOn(injector, "loadPrototype").mockImplementation(() => {});

    // @ts-expect-error Mismatch types
    spyOn(injector, "loadProvider").mockImplementation(() => {});

    await loader.createInstancesOfDependencies();

    expect(loadProviderPrototypeStub).toHaveBeenCalledWith(
      providerWrapper,
      moduleMock.providers
    );
  });

  describe("for every provider in every module", () => {
    const testProviderToken = "TestProvider";

    let loadProviderStub: any;

    beforeEach(async () => {
      const testProviderWrapper = new InstanceWrapper({
        instance: null,
        metatype: TestProvider,
        name: testProviderToken,
        token: testProviderToken,
      });
      moduleMock.providers.set(testProviderToken, testProviderWrapper);

      // @ts-expect-error Mismatch types
      loadProviderStub = spyOn(injector, "loadProvider").mockImplementation(() => {});

      await loader.createInstancesOfDependencies();
    });

    it('should call "loadProvider"', async () => {
      expect(loadProviderStub).toHaveBeenCalledWith(
        moduleMock.providers.get(testProviderToken),
        moduleMock as any
      );
    });

    it('should call "inspectInstanceWrapper"', async () => {
      expect(inspectInstanceWrapperStub).toHaveBeenCalledWith(
        moduleMock.providers.get(testProviderToken),
        moduleMock as any
      );
    });
  });

  describe("for every injectable in every module", () => {
    let loadInjectableStub: any;

    beforeEach(async () => {
      const testInjectable = new InstanceWrapper({
        instance: null,
        metatype: TestProvider,
        name: "TestProvider",
        token: "TestProvider",
      });
      moduleMock.injectables.set("TestProvider", testInjectable);

      // @ts-expect-error Mismatch types
      loadInjectableStub = spyOn(injector, "loadInjectable").mockImplementation(() => {});
      
      await loader.createInstancesOfDependencies();
    });

    it('should call "loadInjectable"', async () => {
      expect(loadInjectableStub).toHaveBeenCalledWith(
        moduleMock.injectables.get("TestProvider"),
        moduleMock as any
      );
    });
    it('should call "inspectInstanceWrapper"', async () => {
      expect(inspectInstanceWrapperStub).toHaveBeenCalledWith(
        moduleMock.injectables.get("TestProvider"),
        moduleMock as any
      );
    });
  });
});