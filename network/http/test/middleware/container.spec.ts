import { expect } from "chai";
import { Controller, MiddlewareConfiguration, RequestMapping, RequestMethod } from "@venok/http";
import { Injectable, VenokContainer } from "@venok/core";
import { MiddlewareContainer, VenokMiddleware } from "@venok/integration";
import { InstanceWrapper, Module } from "@venok/core/injector";

describe("MiddlewareContainer", () => {
  class ExampleModule {}

  @Controller("test")
  class TestRoute {
    @RequestMapping({ path: "test" })
    public getTest() {}

    @RequestMapping({ path: "another", method: RequestMethod.DELETE })
    public getAnother() {}
  }

  @Injectable()
  class TestMiddleware implements VenokMiddleware {
    public use(req: any, res: any, next: () => void) {}
  }

  let container: MiddlewareContainer;

  beforeEach(() => {
    const nestContainer = new VenokContainer();
    const modules = nestContainer.getModules();

    modules.set("Module", new Module(ExampleModule, nestContainer));
    modules.set("Test", new Module(ExampleModule, nestContainer));

    container = new MiddlewareContainer();
  });

  it("should store expected configurations for given module", () => {
    const config: MiddlewareConfiguration[] = [
      {
        middleware: [TestMiddleware],
        to: [TestRoute, "test"],
      },
    ];
    container.insertConfig(config, "Module");
    expect([...(container.getConfigurations().get("Module") as Set<MiddlewareConfiguration<any>>)]).to.deep.equal(
      config,
    );
  });

  it("should store expected middleware for given module", () => {
    const config: MiddlewareConfiguration[] = [
      {
        middleware: TestMiddleware,
        to: [TestRoute],
      },
    ];

    const key = "Test";
    container.insertConfig(config, key);

    const collection = container.getMiddlewareCollection(key);
    const insertedMiddleware = collection.get(TestMiddleware) as InstanceWrapper;

    expect(collection.size).to.eql(config.length);
    expect(insertedMiddleware).to.be.instanceOf(InstanceWrapper);
    expect(insertedMiddleware.scope).to.be.undefined;
    expect(insertedMiddleware.metatype).to.be.eql(TestMiddleware);
  });
});
