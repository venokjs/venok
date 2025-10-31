import { beforeEach, describe, expect, it } from "bun:test";

import { ModulesContainer } from "~/injector/module/container.js";
import { Module } from "~/injector/module/module.js";
import { VenokContainer } from "~/injector/container.js";
import { Injectable } from "~/decorators/injectable.decorator.js";

describe("ModulesContainer", () => {
  let modulesContainer: ModulesContainer;
  let venokContainer: VenokContainer;
  let mockModule1: Module;
  let mockModule2: Module;

  @Injectable()
  class TestModule1 {}

  @Injectable()
  class TestModule2 {}

  beforeEach(() => {
    modulesContainer = new ModulesContainer();
    venokContainer = new VenokContainer();
    
    mockModule1 = new Module(TestModule1, venokContainer);
    mockModule2 = new Module(TestModule2, venokContainer);
  });

  describe("constructor", () => {
    it("should create instance and initialize private applicationId field", () => {
      const container = new ModulesContainer();
      
      // Test that the instance is created properly
      expect(container).toBeInstanceOf(ModulesContainer);
      expect(container).toBeInstanceOf(Map);
      
      // Test that the private field is initialized by checking getter
      expect(typeof container.applicationId).toBe("string");
      expect(container.applicationId.length).toBe(21);
    });

    it("should generate unique applicationId on each instantiation", () => {
      const container1 = new ModulesContainer();
      const container2 = new ModulesContainer();
      const container3 = new ModulesContainer();
      
      // Each instance should have a unique applicationId
      expect(container1.applicationId).not.toBe(container2.applicationId);
      expect(container2.applicationId).not.toBe(container3.applicationId);
      expect(container1.applicationId).not.toBe(container3.applicationId);
    });
  });

  describe("static imports and class definition", () => {
    it("should properly import and use uid function", () => {
      // This test ensures the import statement is executed
      const container = new ModulesContainer();
      const id = container.applicationId;
      
      // Verify that uid function was called correctly (uid generates 21 char string)
      expect(id).toMatch(/^[A-Za-z0-9_-]{21}$/);
      expect(id).not.toBeUndefined();
      expect(id).not.toBeNull();
    });

    it("should properly extend Map class", () => {
      // This test ensures the class definition line is executed
      expect(ModulesContainer.prototype instanceof Map).toBe(true);
      expect(ModulesContainer.prototype.constructor).toBe(ModulesContainer);
      
      const container = new ModulesContainer();
      
      // Test that it has Map methods
      expect(typeof container.set).toBe("function");
      expect(typeof container.get).toBe("function");
      expect(typeof container.has).toBe("function");
      expect(typeof container.delete).toBe("function");
      expect(typeof container.clear).toBe("function");
      expect(typeof container.keys).toBe("function");
      expect(typeof container.values).toBe("function");
      expect(typeof container.entries).toBe("function");
      expect(typeof container.forEach).toBe("function");
      
      // Test that it has custom methods
      expect(typeof container.getById).toBe("function");
      expect(typeof container.applicationId).toBe("string");
    });

    it("should initialize private field on construction", () => {
      // This specifically targets line 6: readonly #applicationId = uid(21);
      const container1 = new ModulesContainer();
      const container2 = new ModulesContainer();
      
      // Each construction should call uid(21) and initialize the private field
      expect(container1.applicationId).toBeDefined();
      expect(container2.applicationId).toBeDefined();
      expect(container1.applicationId).not.toBe(container2.applicationId);
      
      // Test multiple access to confirm field is properly initialized
      const id1a = container1.applicationId;
      const id1b = container1.applicationId;
      expect(id1a).toBe(id1b); // Same instance should return same value
    });
  });

  describe("applicationId", () => {
    it("should return a unique application ID", () => {
      const id = modulesContainer.applicationId;
      
      expect(typeof id).toBe("string");
      expect(id.length).toBe(21); // uid(21) generates 21 character string
    });

    it("should return the same application ID on multiple calls", () => {
      const id1 = modulesContainer.applicationId;
      const id2 = modulesContainer.applicationId;
      
      expect(id1).toBe(id2);
    });

    it("should generate different IDs for different containers", () => {
      const container1 = new ModulesContainer();
      const container2 = new ModulesContainer();
      
      expect(container1.applicationId).not.toBe(container2.applicationId);
    });
  });

  describe("getById", () => {
    beforeEach(() => {
      modulesContainer.set("token1", mockModule1);
      modulesContainer.set("token2", mockModule2);
    });

    it("should return module by ID when found", () => {
      const moduleId = mockModule1.id;
      const result = modulesContainer.getById(moduleId);
      
      expect(result).toBe(mockModule1);
    });

    it("should return undefined when module not found", () => {
      const result = modulesContainer.getById("non-existent-id");
      
      expect(result).toBeUndefined();
    });

    it("should find correct module among multiple modules", () => {
      const moduleId = mockModule2.id;
      const result = modulesContainer.getById(moduleId);
      
      expect(result).toBe(mockModule2);
      expect(result).not.toBe(mockModule1);
    });

    it("should return undefined for empty container", () => {
      const emptyContainer = new ModulesContainer();
      const result = emptyContainer.getById("any-id");
      
      expect(result).toBeUndefined();
    });
  });

  describe("Map inheritance", () => {
    it("should inherit from Map and support set/get operations", () => {
      expect(modulesContainer instanceof Map).toBe(true);
      
      modulesContainer.set("test-token", mockModule1);
      
      expect(modulesContainer.get("test-token")).toBe(mockModule1);
      expect(modulesContainer.has("test-token")).toBe(true);
      expect(modulesContainer.size).toBe(1);
    });

    it("should support delete operations", () => {
      modulesContainer.set("test-token", mockModule1);
      expect(modulesContainer.has("test-token")).toBe(true);
      
      modulesContainer.delete("test-token");
      expect(modulesContainer.has("test-token")).toBe(false);
      expect(modulesContainer.size).toBe(0);
    });

    it("should support clear operations", () => {
      modulesContainer.set("token1", mockModule1);
      modulesContainer.set("token2", mockModule2);
      expect(modulesContainer.size).toBe(2);
      
      modulesContainer.clear();
      expect(modulesContainer.size).toBe(0);
    });

    it("should support iteration", () => {
      modulesContainer.set("token1", mockModule1);
      modulesContainer.set("token2", mockModule2);
      
      const keys = Array.from(modulesContainer.keys());
      const values = Array.from(modulesContainer.values());
      const entries = Array.from(modulesContainer.entries());
      
      expect(keys).toEqual(["token1", "token2"]);
      expect(values).toEqual([mockModule1, mockModule2]);
      expect(entries).toEqual([["token1", mockModule1], ["token2", mockModule2]]);
    });

    it("should support forEach", () => {
      modulesContainer.set("token1", mockModule1);
      modulesContainer.set("token2", mockModule2);
      
      const collected: Array<[string, Module]> = [];
      modulesContainer.forEach((module, token) => {
        collected.push([token, module]);
      });
      
      expect(collected).toEqual([["token1", mockModule1], ["token2", mockModule2]]);
    });
  });

  describe("edge cases", () => {
    it("should handle modules with duplicate IDs correctly", () => {
      // This scenario shouldn't happen in normal usage, but testing edge case
      const module1Copy: Module = Object.create(mockModule1);
      Object.defineProperty(module1Copy, "id", { value: mockModule1.id });
      
      modulesContainer.set("token1", mockModule1);
      modulesContainer.set("token2", module1Copy);
      
      const result = modulesContainer.getById(mockModule1.id);
      // Should return the first match found
      expect(result).toBe(mockModule1);
    });

    it("should handle empty string ID", () => {
      const mockModuleWithEmptyId = Object.create(mockModule1);
      Object.defineProperty(mockModuleWithEmptyId, "id", { value: "" });
      
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      modulesContainer.set("empty-id-token", mockModuleWithEmptyId);
      
      const result = modulesContainer.getById("");
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(result).toBe(mockModuleWithEmptyId);
    });

    it("should handle special character IDs", () => {
      const specialIds = ["@module/test", "module-with-dashes", "module_with_underscores", "123numeric", "🎉emoji"];
      
      specialIds.forEach((id, index) => {
        const mockModuleWithSpecialId = Object.create(mockModule1);
        Object.defineProperty(mockModuleWithSpecialId, "id", { value: id });
        
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        modulesContainer.set(`token-${index}`, mockModuleWithSpecialId);
        
        const result = modulesContainer.getById(id);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        expect(result).toBe(mockModuleWithSpecialId);
      });
    });

    it("should handle null and undefined ID search gracefully", () => {
      // @ts-expect-error Testing edge case with null
      const resultNull = modulesContainer.getById(null);
      expect(resultNull).toBeUndefined();

      // @ts-expect-error Testing edge case with undefined
      const resultUndefined = modulesContainer.getById(undefined);
      expect(resultUndefined).toBeUndefined();
    });

    it("should work correctly with large number of modules", () => {
      const largeContainer = new ModulesContainer();
      const modules: Module[] = [];
      
      // Create 1000 modules
      for (let i = 0; i < 1000; i++) {
        const module = new Module(TestModule1, venokContainer);
        modules.push(module);
        largeContainer.set(`token-${i}`, module);
      }
      
      expect(largeContainer.size).toBe(1000);
      
      // Test finding modules by ID
      const randomIndex = Math.floor(Math.random() * 1000);
      const randomModule = modules[randomIndex];
      const foundModule = largeContainer.getById(randomModule.id);
      
      expect(foundModule).toBe(randomModule);
    });
  });

  describe("comprehensive usage patterns", () => {
    it("should support chaining operations", () => {
      const result = modulesContainer
        .set("test1", mockModule1)
        .set("test2", mockModule2);
      
      expect(result).toBe(modulesContainer);
      expect(modulesContainer.size).toBe(2);
      expect(modulesContainer.has("test1")).toBe(true);
      expect(modulesContainer.has("test2")).toBe(true);
    });

    it("should work with spread operator", () => {
      modulesContainer.set("token1", mockModule1);
      modulesContainer.set("token2", mockModule2);
      
      const entriesArray = [...modulesContainer];
      const keysArray = [...modulesContainer.keys()];
      const valuesArray = [...modulesContainer.values()];
      
      expect(entriesArray).toEqual([["token1", mockModule1], ["token2", mockModule2]]);
      expect(keysArray).toEqual(["token1", "token2"]);
      expect(valuesArray).toEqual([mockModule1, mockModule2]);
    });

    it("should maintain insertion order", () => {
      const tokens = ["z-token", "a-token", "m-token"];
      const modules = [mockModule1, mockModule2, mockModule1]; // reuse modules
      
      tokens.forEach((token, index) => {
        modulesContainer.set(token, modules[index]);
      });
      
      const retrievedTokens = Array.from(modulesContainer.keys());
      expect(retrievedTokens).toEqual(tokens);
    });

    it("should handle module replacement correctly", () => {
      modulesContainer.set("replaceable-token", mockModule1);
      expect(modulesContainer.get("replaceable-token")).toBe(mockModule1);
      
      // Replace with another module
      modulesContainer.set("replaceable-token", mockModule2);
      expect(modulesContainer.get("replaceable-token")).toBe(mockModule2);
      expect(modulesContainer.size).toBe(1);
    });
  });
});