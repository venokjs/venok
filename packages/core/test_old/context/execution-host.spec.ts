import { expect } from "chai";
import { ExecutionContextHost } from "@venok/core/context/execution-host";

describe("ExecutionContextHost", () => {
  let contextHost: ExecutionContextHost;

  const args = ["test", "test2", "test3"],
    constructorRef = { test: "test" },
    callback = () => null;

  beforeEach(() => {
    contextHost = new ExecutionContextHost(args, constructorRef as any, callback);
  });

  describe("getClass", () => {
    it("should return constructorRef", () => {
      expect(contextHost.getClass()).to.be.eql(constructorRef);
    });
  });

  describe("getHandler", () => {
    it("should return handler", () => {
      expect(contextHost.getHandler()).to.be.eql(callback);
    });
  });

  describe("getArgs", () => {
    it("should return args", () => {
      expect(contextHost.getArgs()).to.be.eql(args);
    });
  });

  describe("getArgByIndex", () => {
    it("should return argument by index", () => {
      expect(contextHost.getArgByIndex(0)).to.be.eql(args[0]);
    });
  });
});
