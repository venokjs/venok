import { expect } from "chai";
import { Controller, RequestMapping } from "../../decorators";
import { RequestMethod } from "../../enums";
import { Injectable, VenokContainer } from "@venok/core";
import { MiddlewareConfiguration, VenokMiddleware } from "../../interfaces";
import { MiddlewareContainer } from "../../middleware/container";
import { Module } from "@venok/core/injector/module/module";
import { InstanceWrapper } from "@venok/core/injector/instance/wrapper";

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

    container = new MiddlewareContainer(nestContainer);
  });

  it("should store expected configurations for given module", () => {
    const config: MiddlewareConfiguration[] = [
      {
        middleware: [TestMiddleware],
        forRoutes: [TestRoute, "test"],
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
        forRoutes: [TestRoute],
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
