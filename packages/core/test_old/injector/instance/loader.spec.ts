import "reflect-metadata";
import { expect } from "chai";
import sinon from "sinon";
import { InstanceLoader } from "@venok/core/injector/instance/loader";
import { Injectable } from "@venok/core/decorators/injectable.decorator";
import { Injector } from "@venok/core/injector/injector";
import { GraphInspector } from "@venok/core/inspector/graph-inspector";
import { VenokContainer } from "@venok/core/injector/container";
import { InstanceWrapper } from "@venok/core/injector/instance/wrapper";

describe("InstanceLoader", () => {
  @Injectable()
  class TestProvider {}

  let loader: InstanceLoader;
  let injector: Injector;
  let container: VenokContainer;
  let graphInspector: GraphInspector;
  let inspectInstanceWrapperStub: sinon.SinonStub;
  let mockContainer: sinon.SinonMock;
  let moduleMock: Record<string, any>;

  beforeEach(() => {
    container = new VenokContainer();
    graphInspector = new GraphInspector(container);

    inspectInstanceWrapperStub = sinon.stub(graphInspector, "inspectInstanceWrapper");

    injector = new Injector();
    loader = new InstanceLoader(container, injector, graphInspector);
    mockContainer = sinon.mock(container);

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
    mockContainer.expects("getModules").returns(modules);
  });

  it('should call "loadPrototype" for every provider and controller in every module', async () => {
    const providerWrapper = new InstanceWrapper({
      instance: null,
      metatype: TestProvider,
      token: "TestProvider",
    });

    moduleMock.providers.set("TestProvider", providerWrapper);

    const loadProviderPrototypeStub = sinon.stub(injector, "loadPrototype");

    sinon.stub(injector, "loadProvider");

    await loader.createInstancesOfDependencies();

    expect(loadProviderPrototypeStub.calledWith(providerWrapper, moduleMock.providers)).to.be.true;
  });

  describe("for every provider in every module", () => {
    const testProviderToken = "TestProvider";

    let loadProviderStub: sinon.SinonStub;

    beforeEach(async () => {
      const testProviderWrapper = new InstanceWrapper({
        instance: null,
        metatype: TestProvider,
        name: testProviderToken,
        token: testProviderToken,
      });
      moduleMock.providers.set(testProviderToken, testProviderWrapper);

      loadProviderStub = sinon.stub(injector, "loadProvider");

      await loader.createInstancesOfDependencies();
    });

    it('should call "loadProvider"', async () => {
      expect(loadProviderStub.calledWith(moduleMock.providers.get(testProviderToken), moduleMock as any)).to.be.true;
    });

    it('should call "inspectInstanceWrapper"', async () => {
      expect(inspectInstanceWrapperStub.calledWith(moduleMock.providers.get(testProviderToken), moduleMock as any)).to
        .be.true;
    });
  });

  describe("for every injectable in every module", () => {
    let loadInjectableStub: sinon.SinonStub;

    beforeEach(async () => {
      const testInjectable = new InstanceWrapper({
        instance: null,
        metatype: TestProvider,
        name: "TestProvider",
        token: "TestProvider",
      });
      moduleMock.injectables.set("TestProvider", testInjectable);

      loadInjectableStub = sinon.stub(injector, "loadInjectable");

      await loader.createInstancesOfDependencies();
    });

    it('should call "loadInjectable"', async () => {
      expect(loadInjectableStub.calledWith(moduleMock.injectables.get("TestProvider"), moduleMock as any)).to.be.true;
    });
    it('should call "inspectInstanceWrapper"', async () => {
      expect(inspectInstanceWrapperStub.calledWith(moduleMock.injectables.get("TestProvider"), moduleMock as any)).to.be
        .true;
    });
  });
});
