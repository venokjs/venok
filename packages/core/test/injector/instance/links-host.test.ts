import { beforeEach, describe, expect, it, spyOn } from "bun:test";

import { InstanceLinksHost } from "~/injector/instance/links-host.js";
import { InstanceWrapper } from "~/injector/instance/wrapper.js";
import { VenokContainer } from "~/injector/container.js";
import { Module } from "~/injector/module/module.js";
import { UnknownElementException } from "~/errors/exceptions/unknown-element.exception.js";
import { Injectable } from "~/decorators/injectable.decorator.js";

describe("InstanceLinksHost", () => {
  let container: VenokContainer;

  @Injectable()
  class TestProvider1 {}

  @Injectable()
  class TestProvider2 {}

  @Injectable()
  class TestModule {}

  beforeEach(() => {
    container = new VenokContainer();
  });

  describe("constructor", () => {
    it("should initialize with container and call initialize", () => {
      // @ts-expect-error Mismatch types
      spyOn(container, "getModules").mockReturnValue(new Map());
      
      expect(() => new InstanceLinksHost(container)).not.toThrow();
    });
  });

  describe("get", () => {
    it("should return instance link for existing token", () => {
      const mockModule = new Module(TestModule, container);
      Object.defineProperty(mockModule, "id", {
        value: "test-module",
        writable: false,
      });

      const wrapper = new InstanceWrapper({
        token: TestProvider1,
        name: "TestProvider1",
        metatype: TestProvider1,
        instance: new TestProvider1(),
        isResolved: true,
        host: mockModule,
      });

      mockModule.providers.set(TestProvider1, wrapper);

      // @ts-expect-error Mismatch types
      spyOn(container, "getModules").mockReturnValue(new Map([["test-module", mockModule]]));

      const instanceLinksHost = new InstanceLinksHost(container);
      const result = instanceLinksHost.get(TestProvider1);

      expect(result.token).toBe(TestProvider1);
      expect(result.moduleId).toBe("test-module");
      expect(result.wrapperRef).toBe(wrapper);
      expect(result.collection).toBe(mockModule.providers);
    });

    it("should throw UnknownElementException for non-existing token", () => {
      // @ts-expect-error Mismatch types
      spyOn(container, "getModules").mockReturnValue(new Map());
      
      const instanceLinksHost = new InstanceLinksHost(container);
      
      expect(() => instanceLinksHost.get(TestProvider1)).toThrow(UnknownElementException);
    });

    it("should return array when each option is true", () => {
      const mockModule1 = new Module(TestModule, container);
      const mockModule2 = new Module(TestModule, container);
      
      Object.defineProperty(mockModule1, "id", {
        value: "module-1",
        writable: false,
      });
      Object.defineProperty(mockModule2, "id", {
        value: "module-2",
        writable: false,
      });

      const wrapper1 = new InstanceWrapper({
        token: TestProvider1,
        name: "TestProvider1",
        metatype: TestProvider1,
        instance: new TestProvider1(),
        isResolved: true,
        host: mockModule1,
      });

      const wrapper2 = new InstanceWrapper({
        token: TestProvider1,
        name: "TestProvider1",
        metatype: TestProvider1,
        instance: new TestProvider1(),
        isResolved: true,
        host: mockModule2,
      });

      mockModule1.providers.set(TestProvider1, wrapper1);
      mockModule2.providers.set(TestProvider1, wrapper2);

      // @ts-expect-error Mismatch types
      spyOn(container, "getModules").mockReturnValue(new Map([
        ["module-1", mockModule1],
        ["module-2", mockModule2],
      ]));

      const instanceLinksHost = new InstanceLinksHost(container);
      const result = instanceLinksHost.get(TestProvider1, { each: true });

      expect(Array.isArray(result)).toBe(true);
      expect((result as any[]).length).toBe(2);
    });

    it("should return specific module instance when moduleId is provided", () => {
      const mockModule1 = new Module(TestModule, container);
      const mockModule2 = new Module(TestModule, container);
      
      Object.defineProperty(mockModule1, "id", {
        value: "module-1",
        writable: false,
      });
      Object.defineProperty(mockModule2, "id", {
        value: "module-2",
        writable: false,
      });

      const wrapper1 = new InstanceWrapper({
        token: TestProvider1,
        name: "TestProvider1",
        metatype: TestProvider1,
        instance: new TestProvider1(),
        isResolved: true,
        host: mockModule1,
      });

      const wrapper2 = new InstanceWrapper({
        token: TestProvider1,
        name: "TestProvider1",
        metatype: TestProvider1,
        instance: new TestProvider1(),
        isResolved: true,
        host: mockModule2,
      });

      mockModule1.providers.set(TestProvider1, wrapper1);
      mockModule2.providers.set(TestProvider1, wrapper2);

      // @ts-expect-error Mismatch types
      spyOn(container, "getModules").mockReturnValue(new Map([
        ["module-1", mockModule1],
        ["module-2", mockModule2],
      ]));

      const instanceLinksHost = new InstanceLinksHost(container);
      const result = instanceLinksHost.get(TestProvider1, { moduleId: "module-2" });

      // @ts-expect-error Mismatch types
      expect(result.moduleId).toBe("module-2");
    });

    it("should return last instance when no moduleId and no each option", () => {
      const mockModule1 = new Module(TestModule, container);
      const mockModule2 = new Module(TestModule, container);
      
      Object.defineProperty(mockModule1, "id", {
        value: "module-1",
        writable: false,
      });
      Object.defineProperty(mockModule2, "id", {
        value: "module-2",
        writable: false,
      });

      const wrapper1 = new InstanceWrapper({
        token: TestProvider1,
        name: "TestProvider1",
        metatype: TestProvider1,
        instance: new TestProvider1(),
        isResolved: true,
        host: mockModule1,
      });

      const wrapper2 = new InstanceWrapper({
        token: TestProvider1,
        name: "TestProvider1",
        metatype: TestProvider1,
        instance: new TestProvider1(),
        isResolved: true,
        host: mockModule2,
      });

      mockModule1.providers.set(TestProvider1, wrapper1);
      mockModule2.providers.set(TestProvider1, wrapper2);

      // @ts-expect-error Mismatch types
      spyOn(container, "getModules").mockReturnValue(new Map([
        ["module-1", mockModule1],
        ["module-2", mockModule2],
      ]));

      const instanceLinksHost = new InstanceLinksHost(container);
      const result = instanceLinksHost.get(TestProvider1);

      // Should return the last one added (module-2)
      expect(result.moduleId).toBe("module-2");
    });

    it("should throw UnknownElementException when moduleId not found", () => {
      const mockModule = new Module(TestModule, container);
      Object.defineProperty(mockModule, "id", {
        value: "module-1",
        writable: false,
      });

      const wrapper = new InstanceWrapper({
        token: TestProvider1,
        name: "TestProvider1",
        metatype: TestProvider1,
        instance: new TestProvider1(),
        isResolved: true,
        host: mockModule,
      });

      mockModule.providers.set(TestProvider1, wrapper);

      // @ts-expect-error Mismatch types
      spyOn(container, "getModules").mockReturnValue(new Map([["module-1", mockModule]]));

      const instanceLinksHost = new InstanceLinksHost(container);
      
      expect(() => instanceLinksHost.get(TestProvider1, { moduleId: "non-existent" })).toThrow(UnknownElementException);
    });
  });

  describe("getInstanceNameByToken", () => {
    it("should return function name when token is a function", () => {
      // @ts-expect-error Mismatch types
      spyOn(container, "getModules").mockReturnValue(new Map());
      const instanceLinksHost = new InstanceLinksHost(container);
      
      const result = (instanceLinksHost as any).getInstanceNameByToken(TestProvider1);
      expect(result).toBe("TestProvider1");
    });

    it("should return string when token is a string", () => {
      // @ts-expect-error Mismatch types
      spyOn(container, "getModules").mockReturnValue(new Map());
      const instanceLinksHost = new InstanceLinksHost(container);
      
      const stringToken = "STRING_TOKEN";
      const result = (instanceLinksHost as any).getInstanceNameByToken(stringToken);
      expect(result).toBe("STRING_TOKEN");
    });

    it("should handle function without name", () => {
      // @ts-expect-error Mismatch types
      spyOn(container, "getModules").mockReturnValue(new Map());
      const instanceLinksHost = new InstanceLinksHost(container);
      
      const anonymousFunction = function () {};
      const result = (instanceLinksHost as any).getInstanceNameByToken(anonymousFunction);
      expect(typeof result).toBe("string");
    });

    it("should handle symbol tokens", () => {
      // @ts-expect-error Mismatch types
      spyOn(container, "getModules").mockReturnValue(new Map());
      const instanceLinksHost = new InstanceLinksHost(container);
      
      const symbolToken = Symbol("test-symbol");
      const result = (instanceLinksHost as any).getInstanceNameByToken(symbolToken);
      expect(result).toBe(symbolToken);
    });
  });

  describe("initialize behavior", () => {
    it("should process providers and injectables during initialization", () => {
      const mockModule = new Module(TestModule, container);
      Object.defineProperty(mockModule, "id", {
        value: "test-module",
        writable: false,
      });

      const providerWrapper = new InstanceWrapper({
        token: TestProvider1,
        name: "TestProvider1",
        metatype: TestProvider1,
        instance: new TestProvider1(),
        isResolved: true,
        host: mockModule,
      });

      const injectableWrapper = new InstanceWrapper({
        token: TestProvider2,
        name: "TestProvider2",
        metatype: TestProvider2,
        instance: new TestProvider2(),
        isResolved: true,
        host: mockModule,
      });

      mockModule.providers.set(TestProvider1, providerWrapper);
      mockModule.injectables.set(TestProvider2, injectableWrapper);

      // @ts-expect-error Mismatch types
      spyOn(container, "getModules").mockReturnValue(new Map([["test-module", mockModule]]));

      const instanceLinksHost = new InstanceLinksHost(container);

      // Both providers and injectables should be accessible
      const providerResult = instanceLinksHost.get(TestProvider1);
      const injectableResult = instanceLinksHost.get(TestProvider2);

      expect(providerResult.token).toBe(TestProvider1);
      expect(providerResult.collection).toBe(mockModule.providers);
      expect(injectableResult.token).toBe(TestProvider2);
      expect(injectableResult.collection).toBe(mockModule.injectables);
    });

    it("should handle empty modules container", () => {
      // @ts-expect-error Mismatch types
      spyOn(container, "getModules").mockReturnValue(new Map());

      const instanceLinksHost = new InstanceLinksHost(container);

      expect(() => instanceLinksHost.get(TestProvider1)).toThrow(UnknownElementException);
    });

    it("should handle multiple providers with same token from different collections", () => {
      const mockModule = new Module(TestModule, container);
      Object.defineProperty(mockModule, "id", {
        value: "test-module",
        writable: false,
      });

      const providerWrapper = new InstanceWrapper({
        token: TestProvider1,
        name: "TestProvider1",
        metatype: TestProvider1,
        instance: new TestProvider1(),
        isResolved: true,
        host: mockModule,
      });

      const injectableWrapper = new InstanceWrapper({
        token: TestProvider1,
        name: "TestProvider1",
        metatype: TestProvider1,
        instance: new TestProvider1(),
        isResolved: true,
        host: mockModule,
      });

      mockModule.providers.set(TestProvider1, providerWrapper);
      mockModule.injectables.set(TestProvider1, injectableWrapper);

      // @ts-expect-error Mismatch types
      spyOn(container, "getModules").mockReturnValue(new Map([["test-module", mockModule]]));

      const instanceLinksHost = new InstanceLinksHost(container);
      const results = instanceLinksHost.get(TestProvider1, { each: true }) as any[];

      expect(results.length).toBe(2);
      expect(results[0].collection).toBe(mockModule.providers);
      expect(results[1].collection).toBe(mockModule.injectables);
    });
  });
});