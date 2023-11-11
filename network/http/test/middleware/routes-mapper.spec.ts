import { expect } from "chai";
import { Controller, Get, HttpCode, RequestMapping, Version } from "../../decorators";
import { RequestMethod, VersioningType } from "../../enums";
import { RoutesMapper } from "../../middleware/routes-mapper";
import { VenokContainer } from "@venok/core";
import { MiddlewareConfiguration } from "../../interfaces";
import { HttpConfig } from "../../application/config";

describe("RoutesMapper", () => {
  @Controller("test")
  class TestRoute {
    @RequestMapping({ path: "test" })
    public getTest() {}

    @RequestMapping({ path: "another", method: RequestMethod.DELETE })
    public getAnother() {}

    @Version("1")
    @Get("versioned")
    public getVersioned() {}
  }

  let mapper: RoutesMapper;
  beforeEach(() => {
    const httpConfig = new HttpConfig();
    httpConfig.enableVersioning({ type: VersioningType.URI });
    mapper = new RoutesMapper(new VenokContainer(), httpConfig);
  });

  it('should map @Controller() to "ControllerMetadata" in forRoutes', () => {
    const config: MiddlewareConfiguration = {
      middleware: "Test",
      forRoutes: [
        { path: "test", method: RequestMethod.GET },
        { path: "versioned", version: "1", method: RequestMethod.GET },
        TestRoute,
      ],
    };

    expect(mapper.mapRouteToRouteInfo(config.forRoutes[0])).to.deep.equal([
      { path: "/test", method: RequestMethod.GET },
    ]);

    expect(mapper.mapRouteToRouteInfo(config.forRoutes[1])).to.deep.equal([
      { path: "/versioned", version: "1", method: RequestMethod.GET },
    ]);

    expect(mapper.mapRouteToRouteInfo(config.forRoutes[2])).to.deep.equal([
      { path: "/test/test", method: RequestMethod.GET },
      { path: "/test/another", method: RequestMethod.DELETE },
      { path: "/test/versioned", method: RequestMethod.GET, version: "1" },
    ]);
  });
  @Controller(["test", "test2"])
  class TestRouteWithMultiplePaths {
    @RequestMapping({ path: "test" })
    public getTest() {}

    @RequestMapping({ path: "another", method: RequestMethod.DELETE })
    public getAnother() {}
  }

  it('should map a controller with multiple paths to "ControllerMetadata" in forRoutes', () => {
    const config = {
      middleware: "Test",
      forRoutes: [{ path: "test", method: RequestMethod.GET }, TestRouteWithMultiplePaths],
    };

    expect(mapper.mapRouteToRouteInfo(config.forRoutes[0])).to.deep.equal([
      { path: "/test", method: RequestMethod.GET },
    ]);
    expect(mapper.mapRouteToRouteInfo(config.forRoutes[1])).to.deep.equal([
      { path: "/test/test", method: RequestMethod.GET },
      { path: "/test/another", method: RequestMethod.DELETE },
      { path: "/test2/test", method: RequestMethod.GET },
      { path: "/test2/another", method: RequestMethod.DELETE },
    ]);
  });

  @Controller({
    version: "1",
    path: "versioned",
  })
  class VersionedController {
    @Get()
    hello() {
      return 'Hello from "VersionedController"!';
    }

    @Version("2")
    @Get("/override")
    override() {
      return 'Hello from "VersionedController"!';
    }
  }

  @Controller({
    version: ["1", "2"],
  })
  class MultipleVersionController {
    @Get("multiple")
    multiple() {
      return "Multiple Versions 1 or 2";
    }
  }

  it("should map a versioned controller to the corresponding route info objects (single version)", () => {
    expect(mapper.mapRouteToRouteInfo(VersionedController)).to.deep.equal([
      { path: "/versioned/", version: "1", method: RequestMethod.GET },
      { path: "/versioned/override", version: "2", method: RequestMethod.GET },
    ]);
  });

  it("should map a versioned controller to the corresponding route info objects (multiple versions)", () => {
    expect(mapper.mapRouteToRouteInfo(MultipleVersionController)).to.deep.equal([
      { path: "/multiple", version: "1", method: RequestMethod.GET },
      { path: "/multiple", version: "2", method: RequestMethod.GET },
    ]);
  });
});
