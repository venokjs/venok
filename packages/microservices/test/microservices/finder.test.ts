import type { MicroservicePattern } from "~/interfaces/pattern-metadata.interface.js";
import type { Transport } from "~/interfaces/transport.interface.js";

import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import { MetadataScanner } from "@venok/core";

import { PatternFinder } from "~/microservices/finder.js";
import { PATTERN_EXTRAS_METADATA, PATTERN_HANDLER_METADATA, PATTERN_METADATA, TRANSPORT_METADATA } from "~/constants.js";
import { PatternHandler } from "~/enums/pattern-handler.enum.js";

describe("PatternFinder", () => {
  let patternFinder: PatternFinder;
  let metadataScanner: MetadataScanner;

  beforeEach(() => {
    metadataScanner = new MetadataScanner();
    patternFinder = new PatternFinder(metadataScanner);
  });

  describe("constructor", () => {
    it("should create instance with MetadataScanner", () => {
      expect(patternFinder).toBeDefined();
      expect((patternFinder as any).metadataScanner).toBe(metadataScanner);
    });
  });

  describe("explore", () => {
    class TestService {
      methodWithHandler() {}
      methodWithoutHandler() {}
      eventHandler() {}
      messageHandler() {}
    }

    beforeEach(() => {
      // Set up method metadata for methodWithHandler
      Reflect.defineMetadata(PATTERN_HANDLER_METADATA, PatternHandler.MESSAGE, TestService.prototype.methodWithHandler);
      Reflect.defineMetadata(PATTERN_METADATA, ["test.pattern"], TestService.prototype.methodWithHandler);
      Reflect.defineMetadata(TRANSPORT_METADATA, "TCP" as unknown as Transport, TestService.prototype.methodWithHandler);
      Reflect.defineMetadata(PATTERN_EXTRAS_METADATA, { timeout: 5000 }, TestService.prototype.methodWithHandler);

      // Set up method metadata for eventHandler
      Reflect.defineMetadata(PATTERN_HANDLER_METADATA, PatternHandler.EVENT, TestService.prototype.eventHandler);
      Reflect.defineMetadata(PATTERN_METADATA, ["user.created"], TestService.prototype.eventHandler);

      // Set up method metadata for messageHandler
      Reflect.defineMetadata(PATTERN_HANDLER_METADATA, PatternHandler.MESSAGE, TestService.prototype.messageHandler);
      Reflect.defineMetadata(PATTERN_METADATA, [{ cmd: "get_user" }], TestService.prototype.messageHandler);
    });

    it("should return array of pattern handler metadata for instance", () => {
      const instance = new TestService();
      const results = patternFinder.explore(instance);

      expect(results).toBeArray();
      expect(results.length).toBeGreaterThan(0);
      
      const methodResult = results.find(r => r.methodKey === "methodWithHandler");
      expect(methodResult).toBeDefined();
      expect(methodResult!.patterns).toEqual(["test.pattern"]);
      expect(methodResult!.isEventHandler).toBe(false);
      // @ts-expect-error Mismatch types
      expect(methodResult!.transport).toBe("TCP");
      expect(methodResult!.extras).toEqual({ timeout: 5000 });
    });

    it("should identify event handlers correctly", () => {
      const instance = new TestService();
      const results = patternFinder.explore(instance);

      const eventResult = results.find(r => r.methodKey === "eventHandler");
      expect(eventResult).toBeDefined();
      expect(eventResult!.isEventHandler).toBe(true);
      expect(eventResult!.patterns).toEqual(["user.created"]);
    });

    it("should identify message handlers correctly", () => {
      const instance = new TestService();
      const results = patternFinder.explore(instance);

      const messageResult = results.find(r => r.methodKey === "messageHandler");
      expect(messageResult).toBeDefined();
      expect(messageResult!.isEventHandler).toBe(false);
      expect(messageResult!.patterns).toEqual([{ cmd: "get_user" }]);
    });

    it("should filter out methods without pattern handler metadata", () => {
      const instance = new TestService();
      const results = patternFinder.explore(instance);

      const methodWithoutHandler = results.find(r => r.methodKey === "methodWithoutHandler");
      expect(methodWithoutHandler).toBeUndefined();
    });

    it("should return empty array for instance with no pattern handlers", () => {
      class EmptyService {
        regularMethod() {}
      }

      const instance = new EmptyService();
      const results = patternFinder.explore(instance);

      expect(results).toEqual([]);
    });

    it("should handle empty instance", () => {
      const instance = {};
      const results = patternFinder.explore(instance);

      expect(results).toEqual([]);
    });

    it("should use MetadataScanner to get method names", () => {
      const instance = new TestService();
      const getAllMethodNamesSpy = spyOn(metadataScanner, "getAllMethodNames").mockReturnValue([
        "methodWithHandler", 
        "methodWithoutHandler",
      ]);

      patternFinder.explore(instance);

      expect(getAllMethodNamesSpy).toHaveBeenCalledWith(Object.getPrototypeOf(instance));
    });

    it("should handle complex pattern objects", () => {
      class ComplexService {
        complexMethod() {}
      }

      const complexPattern: MicroservicePattern = {
        service: "user",
        action: {
          type: "create",
          version: 2,
        },
      };

      Reflect.defineMetadata(PATTERN_HANDLER_METADATA, PatternHandler.MESSAGE, ComplexService.prototype.complexMethod);
      Reflect.defineMetadata(PATTERN_METADATA, [complexPattern], ComplexService.prototype.complexMethod);

      const instance = new ComplexService();
      const results = patternFinder.explore(instance);

      const complexResult = results.find(r => r.methodKey === "complexMethod");
      expect(complexResult).toBeDefined();
      expect(complexResult!.patterns).toEqual([complexPattern]);
    });

    it("should handle multiple patterns for single method", () => {
      class MultiPatternService {
        multiMethod() {}
      }

      const patterns = ["pattern1", "pattern2", { cmd: "test" }];
      
      Reflect.defineMetadata(PATTERN_HANDLER_METADATA, PatternHandler.MESSAGE, MultiPatternService.prototype.multiMethod);
      Reflect.defineMetadata(PATTERN_METADATA, patterns, MultiPatternService.prototype.multiMethod);

      const instance = new MultiPatternService();
      const results = patternFinder.explore(instance);

      const multiResult = results.find(r => r.methodKey === "multiMethod");
      expect(multiResult).toBeDefined();
      expect(multiResult!.patterns).toEqual(patterns);
    });
  });

  describe("exploreMethodMetadata", () => {
    class TestService {
      testMethod() {}
      methodWithoutMetadata() {}
    }

    beforeEach(() => {
      Reflect.defineMetadata(PATTERN_HANDLER_METADATA, PatternHandler.MESSAGE, TestService.prototype.testMethod);
      Reflect.defineMetadata(PATTERN_METADATA, ["test.pattern"], TestService.prototype.testMethod);
      Reflect.defineMetadata(TRANSPORT_METADATA, "REDIS" as unknown as Transport, TestService.prototype.testMethod);
      Reflect.defineMetadata(PATTERN_EXTRAS_METADATA, { retries: 3 }, TestService.prototype.testMethod);
    });

    it("should return metadata for method with pattern handler", () => {
      const instance = new TestService();
      const instancePrototype = Object.getPrototypeOf(instance);
      
      const result = patternFinder.exploreMethodMetadata(instance, instancePrototype, "testMethod");

      expect(result).toBeDefined();
      expect(result!.methodKey).toBe("testMethod");
      expect(result!.patterns).toEqual(["test.pattern"]);
      // @ts-expect-error Mismatch types
      expect(result!.transport).toBe("REDIS");
      expect(result!.extras).toEqual({ retries: 3 });
      expect(result!.isEventHandler).toBe(false);
    });

    it("should return undefined for method without pattern handler metadata", () => {
      const instance = new TestService();
      const instancePrototype = Object.getPrototypeOf(instance);
      
      const result = patternFinder.exploreMethodMetadata(instance, instancePrototype, "methodWithoutMetadata");

      expect(result).toBeUndefined();
    });

    it("should correctly identify event handlers", () => {
      class EventService {
        eventMethod() {}
      }

      Reflect.defineMetadata(PATTERN_HANDLER_METADATA, PatternHandler.EVENT, EventService.prototype.eventMethod);
      Reflect.defineMetadata(PATTERN_METADATA, ["user.deleted"], EventService.prototype.eventMethod);

      const instance = new EventService();
      const instancePrototype = Object.getPrototypeOf(instance);
      
      const result = patternFinder.exploreMethodMetadata(instance, instancePrototype, "eventMethod");

      expect(result).toBeDefined();
      expect(result!.isEventHandler).toBe(true);
      expect(result!.patterns).toEqual(["user.deleted"]);
    });

    it("should handle method with only handler type metadata", () => {
      class MinimalService {
        minimalMethod() {}
      }

      Reflect.defineMetadata(PATTERN_HANDLER_METADATA, PatternHandler.MESSAGE, MinimalService.prototype.minimalMethod);

      const instance = new MinimalService();
      const instancePrototype = Object.getPrototypeOf(instance);
      
      const result = patternFinder.exploreMethodMetadata(instance, instancePrototype, "minimalMethod");

      expect(result).toBeDefined();
      expect(result!.methodKey).toBe("minimalMethod");
      expect(result!.patterns).toBeUndefined();
      expect(result!.transport).toBeUndefined();
      expect(result!.extras).toBeUndefined();
      expect(result!.isEventHandler).toBe(false);
    });

    it("should handle method with null/undefined metadata values", () => {
      class NullMetadataService {
        nullMethod() {}
      }

      Reflect.defineMetadata(PATTERN_HANDLER_METADATA, PatternHandler.MESSAGE, NullMetadataService.prototype.nullMethod);
      Reflect.defineMetadata(PATTERN_METADATA, null, NullMetadataService.prototype.nullMethod);
      Reflect.defineMetadata(TRANSPORT_METADATA, undefined, NullMetadataService.prototype.nullMethod);

      const instance = new NullMetadataService();
      const instancePrototype = Object.getPrototypeOf(instance);
      
      const result = patternFinder.exploreMethodMetadata(instance, instancePrototype, "nullMethod");

      expect(result).toBeDefined();
      expect(result!.patterns).toBeNull();
      expect(result!.transport).toBeUndefined();
    });

    it("should return metadata based on prototype callback function", () => {
      const instance = new TestService();
      const instancePrototype = Object.getPrototypeOf(instance);
      const prototypeCallback = instancePrototype.testMethod;

      const getMetadataSpy = spyOn(Reflect, "getMetadata");
      
      patternFinder.exploreMethodMetadata(instance, instancePrototype, "testMethod");

      expect(getMetadataSpy).toHaveBeenCalledWith(PATTERN_HANDLER_METADATA, prototypeCallback);
      expect(getMetadataSpy).toHaveBeenCalledWith(PATTERN_METADATA, prototypeCallback);
      expect(getMetadataSpy).toHaveBeenCalledWith(TRANSPORT_METADATA, prototypeCallback);
      expect(getMetadataSpy).toHaveBeenCalledWith(PATTERN_EXTRAS_METADATA, prototypeCallback);
    });

    it("should handle non-existent method names gracefully", () => {
      const instance = new TestService();
      const instancePrototype = Object.getPrototypeOf(instance);
      
      // Mock the non-existent method to avoid TypeError with Reflect.getMetadata
      const nonExistentCallback = function () {};
      (instancePrototype)["nonExistentMethod"] = nonExistentCallback;
      
      const result = patternFinder.exploreMethodMetadata(instance, instancePrototype, "nonExistentMethod");

      expect(result).toBeUndefined();
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle instance with null prototype", () => {
      const instance = Object.create(null);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const results = patternFinder.explore(instance);

      expect(results).toEqual([]);
    });

    it("should handle inheritance properly", () => {
      class ParentService {
        parentMethod() {}
      }

      class ChildService extends ParentService {
        childMethod() {}
      }

      Reflect.defineMetadata(PATTERN_HANDLER_METADATA, PatternHandler.MESSAGE, ParentService.prototype.parentMethod);
      Reflect.defineMetadata(PATTERN_METADATA, ["parent.pattern"], ParentService.prototype.parentMethod);

      Reflect.defineMetadata(PATTERN_HANDLER_METADATA, PatternHandler.EVENT, ChildService.prototype.childMethod);
      Reflect.defineMetadata(PATTERN_METADATA, ["child.pattern"], ChildService.prototype.childMethod);

      const instance = new ChildService();
      const results = patternFinder.explore(instance);

      expect(results).toHaveLength(2);
      
      const parentResult = results.find(r => r.methodKey === "parentMethod");
      const childResult = results.find(r => r.methodKey === "childMethod");
      
      expect(parentResult).toBeDefined();
      expect(childResult).toBeDefined();
    });

    it("should handle methods with falsy pattern metadata", () => {
      class FalsyService {
        falsyMethod() {}
      }

      Reflect.defineMetadata(PATTERN_HANDLER_METADATA, PatternHandler.MESSAGE, FalsyService.prototype.falsyMethod);
      Reflect.defineMetadata(PATTERN_METADATA, "", FalsyService.prototype.falsyMethod);

      const instance = new FalsyService();
      const results = patternFinder.explore(instance);

      const falsyResult = results.find(r => r.methodKey === "falsyMethod");
      expect(falsyResult).toBeDefined();
      // @ts-expect-error Mismatch types
      expect(falsyResult!.patterns).toBe("");
    });

    it("should filter out undefined results from map", () => {
      class MixedService {
        handlerMethod() {}
        regularMethod() {}
        anotherHandlerMethod() {}
      }

      Reflect.defineMetadata(PATTERN_HANDLER_METADATA, PatternHandler.MESSAGE, MixedService.prototype.handlerMethod);
      Reflect.defineMetadata(PATTERN_METADATA, ["handler.pattern"], MixedService.prototype.handlerMethod);

      Reflect.defineMetadata(PATTERN_HANDLER_METADATA, PatternHandler.EVENT, MixedService.prototype.anotherHandlerMethod);
      Reflect.defineMetadata(PATTERN_METADATA, ["another.pattern"], MixedService.prototype.anotherHandlerMethod);

      const instance = new MixedService();
      const results = patternFinder.explore(instance);

      expect(results).toHaveLength(2);
      expect(results.every(result => result !== undefined)).toBe(true);
      
      const methodNames = results.map(r => r.methodKey);
      expect(methodNames).toContain("handlerMethod");
      expect(methodNames).toContain("anotherHandlerMethod");
      expect(methodNames).not.toContain("regularMethod");
    });

    it("should handle MetadataScanner returning empty array", () => {
      const getAllMethodNamesSpy = spyOn(metadataScanner, "getAllMethodNames").mockReturnValue([]);

      const instance = {};
      const results = patternFinder.explore(instance);

      expect(results).toEqual([]);
      expect(getAllMethodNamesSpy).toHaveBeenCalledWith(Object.getPrototypeOf(instance));
    });

    it("should work with different handler type values", () => {
      class HandlerTypesService {
        messageMethod() {}
        eventMethod() {}
        invalidMethod() {}
      }

      Reflect.defineMetadata(PATTERN_HANDLER_METADATA, PatternHandler.MESSAGE, HandlerTypesService.prototype.messageMethod);
      Reflect.defineMetadata(PATTERN_METADATA, ["message.pattern"], HandlerTypesService.prototype.messageMethod);

      Reflect.defineMetadata(PATTERN_HANDLER_METADATA, PatternHandler.EVENT, HandlerTypesService.prototype.eventMethod);
      Reflect.defineMetadata(PATTERN_METADATA, ["event.pattern"], HandlerTypesService.prototype.eventMethod);

      // Invalid handler type (should still be processed)
      Reflect.defineMetadata(PATTERN_HANDLER_METADATA, 999, HandlerTypesService.prototype.invalidMethod);
      Reflect.defineMetadata(PATTERN_METADATA, ["invalid.pattern"], HandlerTypesService.prototype.invalidMethod);

      const instance = new HandlerTypesService();
      const results = patternFinder.explore(instance);

      expect(results).toHaveLength(3);

      const messageResult = results.find(r => r.methodKey === "messageMethod");
      const eventResult = results.find(r => r.methodKey === "eventMethod");
      const invalidResult = results.find(r => r.methodKey === "invalidMethod");

      expect(messageResult!.isEventHandler).toBe(false);
      expect(eventResult!.isEventHandler).toBe(true);
      expect(invalidResult!.isEventHandler).toBe(false); // Default to false for non-EVENT values
    });
  });

  describe("performance considerations", () => {
    it("should handle large number of methods efficiently", () => {
      // Create a class with many methods
      class LargeService {}

      const methodCount = 1000;
      for (let i = 0; i < methodCount; i++) {
        const methodName = `method${i}`;
        (LargeService.prototype as any)[methodName] = function () {};
        
        // Add metadata to every 10th method
        if (i % 10 === 0) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          Reflect.defineMetadata(PATTERN_HANDLER_METADATA, PatternHandler.MESSAGE, (LargeService.prototype as any)[methodName]);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          Reflect.defineMetadata(PATTERN_METADATA, [`pattern${i}`], (LargeService.prototype as any)[methodName]);
        }
      }

      const instance = new LargeService();
      const startTime = Date.now();
      const results = patternFinder.explore(instance);
      const endTime = Date.now();

      expect(results).toHaveLength(100); // Every 10th method
      expect(endTime - startTime).toBeLessThan(100); // Should complete in reasonable time
    });
  });
});