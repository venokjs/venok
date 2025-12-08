 
import { describe, expect, it } from "bun:test";
import { Scope } from "@venok/core";
import { Controller } from "~/decorators/controller.decorator.js";
import { ControllerDiscovery } from "~/helpers/discovery.helper.js";

describe("@Controller", () => {
  it("should enhance class with expected controller metadata when no options provided", () => {
    @Controller()
    class TestController {}

    const discovery = Reflect.getMetadata(Controller.KEY, TestController) as ControllerDiscovery;
    
    expect(discovery).toBeInstanceOf(ControllerDiscovery);
    expect(discovery.getPrefixes()).toBe("/");
    expect(discovery.getHost()).toBeUndefined();
    expect(discovery.getScope()).toBeUndefined();
    expect(discovery.getVersion()).toBeUndefined();
  });

  it("should enhance class with expected controller metadata when string path provided", () => {
    @Controller("api")
    class TestController {}

    const discovery = Reflect.getMetadata(Controller.KEY, TestController) as ControllerDiscovery;
    
    expect(discovery).toBeInstanceOf(ControllerDiscovery);
    expect(discovery.getPrefixes()).toBe("api");
    expect(discovery.getHost()).toBeUndefined();
    expect(discovery.getScope()).toBeUndefined();
    expect(discovery.getVersion()).toBeUndefined();
  });

  it("should enhance class with expected controller metadata when array path provided", () => {
    @Controller(["api", "v1"])
    class TestController {}

    const discovery = Reflect.getMetadata(Controller.KEY, TestController) as ControllerDiscovery;
    
    expect(discovery).toBeInstanceOf(ControllerDiscovery);
    expect(discovery.getPrefixes()).toEqual(["api", "v1"]);
    expect(discovery.getHost()).toBeUndefined();
    expect(discovery.getScope()).toBeUndefined();
    expect(discovery.getVersion()).toBeUndefined();
  });

  it("should enhance class with expected controller metadata when options object provided", () => {
    @Controller({
      path: "api/users",
      host: "example.com",
      scope: Scope.REQUEST,
      durable: true,
      version: "1",
    })
    class TestController {}

    const discovery = Reflect.getMetadata(Controller.KEY, TestController) as ControllerDiscovery;
    
    expect(discovery).toBeInstanceOf(ControllerDiscovery);
    expect(discovery.getPrefixes()).toBe("api/users");
    expect(discovery.getHost()).toBe("example.com");
    expect(discovery.getScope()).toEqual({ scope: Scope.REQUEST, durable: true });
    expect(discovery.getVersion()).toBe("1");
  });

  it("should use default path when path is not provided in options", () => {
    @Controller({
      host: "example.com",
    })
    class TestController {}

    const discovery = Reflect.getMetadata(Controller.KEY, TestController) as ControllerDiscovery;
    
    expect(discovery.getPrefixes()).toBe("/");
    expect(discovery.getHost()).toBe("example.com");
  });

  it("should handle string host option", () => {
    @Controller({
      path: "api",
      host: "api.example.com",
    })
    class TestController {}

    const discovery = Reflect.getMetadata(Controller.KEY, TestController) as ControllerDiscovery;
    
    expect(discovery.getHost()).toBe("api.example.com");
  });

  it("should handle RegExp host option", () => {
    const hostRegex = /.*\.example\.com$/;
    
    @Controller({
      path: "api",
      host: hostRegex,
    })
    class TestController {}

    const discovery = Reflect.getMetadata(Controller.KEY, TestController) as ControllerDiscovery;
    
    expect(discovery.getHost()).toBe(hostRegex);
  });

  it("should handle array host option", () => {
    const hostArray = ["api.example.com", /.*\.test\.com$/];
    
    @Controller({
      path: "api",
      host: hostArray,
    })
    class TestController {}

    const discovery = Reflect.getMetadata(Controller.KEY, TestController) as ControllerDiscovery;
    
    expect(discovery.getHost()).toEqual(hostArray);
  });

  it("should handle version array and deduplicate values", () => {
    @Controller({
      path: "api",
      version: ["1", "2", "1", "3"],
    })
    class TestController {}

    const discovery = Reflect.getMetadata(Controller.KEY, TestController) as ControllerDiscovery;
    
    expect(discovery.getVersion()).toEqual(["1", "2", "3"]);
  });

  it("should handle string version", () => {
    @Controller({
      path: "api",
      version: "1.0",
    })
    class TestController {}

    const discovery = Reflect.getMetadata(Controller.KEY, TestController) as ControllerDiscovery;
    
    expect(discovery.getVersion()).toBe("1.0");
  });

  it("should handle Symbol version", () => {
    const versionSymbol = Symbol("version");

    // @ts-expect-error Mismatch types
    @Controller({
      path: "api",
      version: versionSymbol,
    })
    class TestController {}

    const discovery = Reflect.getMetadata(Controller.KEY, TestController) as ControllerDiscovery;
    // @ts-expect-error Mismatch types
    expect(discovery.getVersion()).toBe(versionSymbol);
  });

  it("should handle all scope options", () => {
    @Controller({
      path: "api",
      scope: Scope.TRANSIENT,
      durable: false,
    })
    class TestController {}

    const discovery = Reflect.getMetadata(Controller.KEY, TestController) as ControllerDiscovery;
    
    expect(discovery.getScope()).toEqual({ scope: Scope.TRANSIENT, durable: false });
  });

  it("should handle mixed options", () => {
    @Controller({
      path: ["api", "v2"],
      host: /.*\.staging\.com$/,
      scope: Scope.REQUEST,
      version: ["2", "3"],
    })
    class TestController {}

    const discovery = Reflect.getMetadata(Controller.KEY, TestController) as ControllerDiscovery;
    
    expect(discovery.getPrefixes()).toEqual(["api", "v2"]);
    expect(discovery.getHost()).toEqual(/.*\.staging\.com$/);
    expect(discovery.getScope()).toEqual({ scope: Scope.REQUEST, durable: undefined });
    expect(discovery.getVersion()).toEqual(["2", "3"]);
  });

  it("should have KEY property", () => {
    expect(Controller.KEY).toBeDefined();
    expect(typeof Controller.KEY).toBe("string");
  });
});