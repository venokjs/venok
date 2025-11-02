import { beforeEach, describe, expect, it, spyOn } from "bun:test";

import { MetaHostStorage } from "~/storage/meta-host.storage.js";
import { InstanceWrapper } from "~/injector/instance/wrapper.js";
import { ModulesContainer } from "~/injector/module/container.js";
import { Injectable } from "~/decorators/injectable.decorator.js";

describe("MetaHostStorage", () => {
  let modulesContainer: ModulesContainer;
  let instanceWrapper: InstanceWrapper;

  @Injectable()
  class TestProvider {}

  @Injectable()
  class AnotherProvider {}

  beforeEach(() => {
    // Clear static maps before each test
    MetaHostStorage.metaHostLinks.clear();
    
    modulesContainer = new ModulesContainer();
    instanceWrapper = new InstanceWrapper({
      name: "TestProvider",
      token: TestProvider,
      metatype: TestProvider,
      instance: new TestProvider(),
      isResolved: true,
    });
  });

  describe("metaHostLinks", () => {
    it("should be a static Map", () => {
      expect(MetaHostStorage.metaHostLinks).toBeInstanceOf(Map);
    });

    it("should be accessible across instances", () => {
      MetaHostStorage.metaHostLinks.set(TestProvider, "test-key");
      expect(MetaHostStorage.metaHostLinks.get(TestProvider)).toBe("test-key");
    });

    it("should persist between calls", () => {
      MetaHostStorage.addClassMetaHostLink(TestProvider, "persistent-key");
      expect(MetaHostStorage.metaHostLinks.get(TestProvider)).toBe("persistent-key");
    });
  });

  describe("addClassMetaHostLink", () => {
    it("should add a link between class and metadata key", () => {
      const metadataKey = "test-metadata-key";

      MetaHostStorage.addClassMetaHostLink(TestProvider, metadataKey);

      expect(MetaHostStorage.metaHostLinks.has(TestProvider)).toBe(true);
      expect(MetaHostStorage.metaHostLinks.get(TestProvider)).toBe(metadataKey);
    });

    it("should work with Function type", () => {
      const testFunction = function TestFunction() {};
      const metadataKey = "function-metadata-key";

      MetaHostStorage.addClassMetaHostLink(testFunction, metadataKey);

      expect(MetaHostStorage.metaHostLinks.has(testFunction)).toBe(true);
      expect(MetaHostStorage.metaHostLinks.get(testFunction)).toBe(metadataKey);
    });

    it("should overwrite existing metadata key for same class", () => {
      const firstKey = "first-key";
      const secondKey = "second-key";

      MetaHostStorage.addClassMetaHostLink(TestProvider, firstKey);
      expect(MetaHostStorage.metaHostLinks.get(TestProvider)).toBe(firstKey);

      MetaHostStorage.addClassMetaHostLink(TestProvider, secondKey);
      expect(MetaHostStorage.metaHostLinks.get(TestProvider)).toBe(secondKey);
    });

    it("should handle multiple different classes", () => {
      const firstKey = "first-key";
      const secondKey = "second-key";

      MetaHostStorage.addClassMetaHostLink(TestProvider, firstKey);
      MetaHostStorage.addClassMetaHostLink(AnotherProvider, secondKey);

      expect(MetaHostStorage.metaHostLinks.get(TestProvider)).toBe(firstKey);
      expect(MetaHostStorage.metaHostLinks.get(AnotherProvider)).toBe(secondKey);
      expect(MetaHostStorage.metaHostLinks.size).toBe(2);
    });
  });

  describe("inspectProvider", () => {
    it("should call inspectInstanceWrapper with correct parameters", () => {
      const inspectSpy = spyOn(MetaHostStorage as any, "inspectInstanceWrapper");

      MetaHostStorage.inspectProvider(modulesContainer, instanceWrapper);

      expect(inspectSpy).toHaveBeenCalledWith(
        modulesContainer,
        instanceWrapper,
        (MetaHostStorage as any).providersByMetaKey
      );
    });

    it("should return the result from inspectInstanceWrapper", () => {
      const mockResult = "test-result";
      spyOn(MetaHostStorage as any, "inspectInstanceWrapper").mockReturnValue(mockResult);

      const result = MetaHostStorage.inspectProvider(modulesContainer, instanceWrapper);

      // @ts-expect-error Mismatch types
      expect(result).toBe(mockResult);
    });

    it("should not throw when called with valid parameters", () => {
      expect(() => {
        MetaHostStorage.inspectProvider(modulesContainer, instanceWrapper);
      }).not.toThrow();
    });
  });

  describe("insertByMetaKey", () => {
    let collection: Map<string, Set<InstanceWrapper>>;

    beforeEach(() => {
      collection = new Map();
    });

    it("should create new Set and add wrapper when metaKey does not exist", () => {
      const metaKey = "new-meta-key";

      MetaHostStorage.insertByMetaKey(metaKey, instanceWrapper, collection);

      expect(collection.has(metaKey)).toBe(true);
      const wrappers = collection.get(metaKey);
      expect(wrappers).toBeInstanceOf(Set);
      expect(wrappers?.has(instanceWrapper)).toBe(true);
      expect(wrappers?.size).toBe(1);
    });

    it("should add wrapper to existing Set when metaKey exists", () => {
      const metaKey = "existing-meta-key";
      const existingWrapper = new InstanceWrapper({
        name: "ExistingProvider",
        token: AnotherProvider,
        metatype: AnotherProvider,
        instance: new AnotherProvider(),
        isResolved: true,
      });

      // Pre-populate collection
      const existingSet = new Set([existingWrapper]);
      collection.set(metaKey, existingSet);

      MetaHostStorage.insertByMetaKey(metaKey, instanceWrapper, collection);

      const wrappers = collection.get(metaKey);
      expect(wrappers?.size).toBe(2);
      expect(wrappers?.has(existingWrapper)).toBe(true);
      expect(wrappers?.has(instanceWrapper)).toBe(true);
    });

    it("should not add duplicate wrappers to the same Set", () => {
      const metaKey = "duplicate-test";

      MetaHostStorage.insertByMetaKey(metaKey, instanceWrapper, collection);
      MetaHostStorage.insertByMetaKey(metaKey, instanceWrapper, collection);

      const wrappers = collection.get(metaKey);
      expect(wrappers?.size).toBe(1);
      expect(wrappers?.has(instanceWrapper)).toBe(true);
    });

    it("should handle multiple different metaKeys", () => {
      const metaKey1 = "meta-key-1";
      const metaKey2 = "meta-key-2";
      const wrapper2 = new InstanceWrapper({
        name: "AnotherProvider",
        token: AnotherProvider,
        metatype: AnotherProvider,
        instance: new AnotherProvider(),
        isResolved: true,
      });

      MetaHostStorage.insertByMetaKey(metaKey1, instanceWrapper, collection);
      MetaHostStorage.insertByMetaKey(metaKey2, wrapper2, collection);

      expect(collection.size).toBe(2);
      expect(collection.get(metaKey1)?.has(instanceWrapper)).toBe(true);
      expect(collection.get(metaKey2)?.has(wrapper2)).toBe(true);
    });
  });

  describe("getProvidersByMetaKey", () => {
    it("should return empty Set when no providers exist for metaKey", () => {
      const metaKey = "nonexistent-key";

      const result = MetaHostStorage.getProvidersByMetaKey(modulesContainer, metaKey);

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    });

    it("should return empty Set when container has no metadata", () => {
      const metaKey = "some-key";

      const result = MetaHostStorage.getProvidersByMetaKey(modulesContainer, metaKey);

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    });

    it("should return empty Set for unknown containers", () => {
      const unknownContainer = new ModulesContainer();
      const result = MetaHostStorage.getProvidersByMetaKey(unknownContainer, "any-key");

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    });
  });

  describe("basic functionality tests", () => {
    it("should handle null metatype wrappers gracefully", () => {
      const valueWrapper = new InstanceWrapper({
        name: "ValueProvider",
        token: "ValueProvider",
        metatype: null,
        instance: { value: "test" },
        isResolved: true,
      });

      // This should not throw
      expect(() => {
        MetaHostStorage.inspectProvider(modulesContainer, valueWrapper);
      }).not.toThrow();
    });

    it("should handle wrappers without instances", () => {
      const uninitializedWrapper = new InstanceWrapper({
        name: "UnInitProvider",
        token: TestProvider,
        metatype: TestProvider,
        instance: null,
        isResolved: false,
      });

      expect(() => {
        MetaHostStorage.inspectProvider(modulesContainer, uninitializedWrapper);
      }).not.toThrow();
    });

    it("should handle factory wrappers with inject property", () => {
      const factoryWrapper = new InstanceWrapper({
        name: "FactoryProvider",
        token: "FactoryProvider",
        metatype: () => new TestProvider(),
        inject: [TestProvider],
        instance: new TestProvider(),
        isResolved: true,
      });

      expect(() => {
        MetaHostStorage.inspectProvider(modulesContainer, factoryWrapper);
      }).not.toThrow();
    });
  });

  describe("static methods accessibility", () => {
    it("should expose all expected static methods", () => {
      expect(typeof MetaHostStorage.addClassMetaHostLink).toBe("function");
      expect(typeof MetaHostStorage.inspectProvider).toBe("function");
      expect(typeof MetaHostStorage.insertByMetaKey).toBe("function");
      expect(typeof MetaHostStorage.getProvidersByMetaKey).toBe("function");
    });

    it("should maintain static state correctly", () => {
      // Verify initial state
      const initialSize = MetaHostStorage.metaHostLinks.size;
      
      // Add a link
      MetaHostStorage.addClassMetaHostLink(TestProvider, "test-static");
      expect(MetaHostStorage.metaHostLinks.size).toBe(initialSize + 1);
      
      // Clear and verify
      MetaHostStorage.metaHostLinks.clear();
      expect(MetaHostStorage.metaHostLinks.size).toBe(0);
    });
  });

  describe("WeakMap isolation", () => {
    it("should isolate data between different module containers", () => {
      const container1 = new ModulesContainer();
      const container2 = new ModulesContainer();

      // Both should return empty sets initially
      const result1 = MetaHostStorage.getProvidersByMetaKey(container1, "test-key");
      const result2 = MetaHostStorage.getProvidersByMetaKey(container2, "test-key");

      expect(result1.size).toBe(0);
      expect(result2.size).toBe(0);
      expect(result1).not.toBe(result2); // Different instances
    });

    it("should handle multiple calls to same container", () => {
      const container = new ModulesContainer();
      
      const result1 = MetaHostStorage.getProvidersByMetaKey(container, "key1");
      const result2 = MetaHostStorage.getProvidersByMetaKey(container, "key2");
      const result3 = MetaHostStorage.getProvidersByMetaKey(container, "key1"); // Same key as first

      expect(result1).toBeInstanceOf(Set);
      expect(result2).toBeInstanceOf(Set);
      expect(result3).toBeInstanceOf(Set);
      
      // All should be empty since no providers were added
      expect(result1.size).toBe(0);
      expect(result2.size).toBe(0);
      expect(result3.size).toBe(0);
    });
  });

  describe("edge case scenarios", () => {
    it("should handle empty string metadata keys", () => {
      const emptyKey = "";
      
      MetaHostStorage.addClassMetaHostLink(TestProvider, emptyKey);
      expect(MetaHostStorage.metaHostLinks.get(TestProvider)).toBe(emptyKey);
      
      const providers = MetaHostStorage.getProvidersByMetaKey(modulesContainer, emptyKey);
      expect(providers).toBeInstanceOf(Set);
    });

    it("should handle very long metadata keys", () => {
      const longKey = "a".repeat(1000);
      
      MetaHostStorage.addClassMetaHostLink(TestProvider, longKey);
      expect(MetaHostStorage.metaHostLinks.get(TestProvider)).toBe(longKey);
    });

    it("should handle special characters in metadata keys", () => {
      const specialKey = "key-with-special-chars!@#$%^&*()_+-=[]{}|;:,.<>?";
      
      MetaHostStorage.addClassMetaHostLink(TestProvider, specialKey);
      expect(MetaHostStorage.metaHostLinks.get(TestProvider)).toBe(specialKey);
    });
  });
});