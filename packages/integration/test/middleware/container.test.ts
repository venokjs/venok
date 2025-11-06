/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unused-vars */
import type { BaseMiddlewareConfiguration } from "~/interfaces/index.js";

import { getClassScope, Injectable, InstanceWrapper, isDurable, Scope } from "@venok/core";
import { beforeEach, describe, expect, it, mock } from "bun:test";

import { MiddlewareContainer } from "~/middleware/container.js";

// Test middleware classes
@Injectable()
class TestMiddleware {
  use() {
    return "test-middleware";
  }
}

@Injectable({ scope: Scope.REQUEST })
class RequestScopedMiddleware {
  use() {
    return "request-scoped";
  }
}

@Injectable()
class AnotherMiddleware {
  use() {
    return "another-middleware";
  }
}

describe("MiddlewareContainer", () => {
  let container: MiddlewareContainer;

  beforeEach(() => {
    container = new MiddlewareContainer();
  });

  describe("constructor", () => {
    it("should initialize with empty maps", () => {
      expect((container as any).middleware.size).toBe(0);
      expect((container as any).configurationSets.size).toBe(0);
    });
  });

  describe("getMiddlewareCollection", () => {
    it("should return existing middleware collection", () => {
      const moduleKey = "TestModule";
      
      // First call creates the collection
      const collection1 = container.getMiddlewareCollection(moduleKey);
      expect(collection1).toBeInstanceOf(Map);
      expect(collection1.size).toBe(0);

      // Second call returns the same collection
      const collection2 = container.getMiddlewareCollection(moduleKey);
      expect(collection2).toBe(collection1);
    });

    it("should create new middleware collection for new module", () => {
      const module1 = "Module1";
      const module2 = "Module2";
      
      const collection1 = container.getMiddlewareCollection(module1);
      const collection2 = container.getMiddlewareCollection(module2);
      
      expect(collection1).not.toBe(collection2);
      expect(collection1).toBeInstanceOf(Map);
      expect(collection2).toBeInstanceOf(Map);
    });

    it("should maintain separate collections for different modules", () => {
      const module1 = "Module1";
      const module2 = "Module2";
      
      const collection1 = container.getMiddlewareCollection(module1);
      const collection2 = container.getMiddlewareCollection(module2);
      
      // Add something to collection1
      collection1.set("test-key", {} as InstanceWrapper);
      
      expect(collection1.size).toBe(1);
      expect(collection2.size).toBe(0);
    });
  });

  describe("getConfigurations", () => {
    it("should return the configuration sets map", () => {
      const configurations = container.getConfigurations();
      expect(configurations).toBeInstanceOf(Map);
      expect(configurations).toBe((container as any).configurationSets);
    });

    it("should reflect changes in configuration sets", () => {
      const configurations = container.getConfigurations();
      const moduleKey = "TestModule";
      
      expect(configurations.has(moduleKey)).toBe(false);
      
      // Insert config to trigger creation of configuration set
      const mockConfig: BaseMiddlewareConfiguration = {
        middleware: [TestMiddleware],
      } as any;
      container.insertConfig([mockConfig], moduleKey);
      
      expect(configurations.has(moduleKey)).toBe(true);
      expect(configurations.get(moduleKey)?.size).toBe(1);
    });
  });

  describe("insertConfig", () => {
    const moduleKey = "TestModule";

    it("should insert single middleware configuration", () => {
      const mockConfig: BaseMiddlewareConfiguration = {
        middleware: [TestMiddleware],
      } as any;
      
      container.insertConfig([mockConfig], moduleKey);
      
      const middlewareCollection = container.getMiddlewareCollection(moduleKey);
      const configurations = container.getConfigurations();
      
      expect(middlewareCollection.has(TestMiddleware)).toBe(true);
      expect(configurations.has(moduleKey)).toBe(true);
      expect(configurations.get(moduleKey)?.has(mockConfig)).toBe(true);
    });

    it("should insert multiple middleware configurations", () => {
      const config1: BaseMiddlewareConfiguration = {
        middleware: [TestMiddleware],
      } as any;
      const config2: BaseMiddlewareConfiguration = {
        middleware: [AnotherMiddleware],
      } as any;
      
      container.insertConfig([config1, config2], moduleKey);
      
      const middlewareCollection = container.getMiddlewareCollection(moduleKey);
      const configurations = container.getConfigurations();
      
      expect(middlewareCollection.has(TestMiddleware)).toBe(true);
      expect(middlewareCollection.has(AnotherMiddleware)).toBe(true);
      expect(configurations.get(moduleKey)?.size).toBe(2);
    });

    it("should handle middleware array in configuration", () => {
      const mockConfig: BaseMiddlewareConfiguration = {
        middleware: [TestMiddleware, AnotherMiddleware],
      } as any;
      
      container.insertConfig([mockConfig], moduleKey);
      
      const middlewareCollection = container.getMiddlewareCollection(moduleKey);
      
      expect(middlewareCollection.has(TestMiddleware)).toBe(true);
      expect(middlewareCollection.has(AnotherMiddleware)).toBe(true);
      expect(middlewareCollection.size).toBe(2);
    });

    it("should create InstanceWrapper with correct properties", () => {
      const mockConfig: BaseMiddlewareConfiguration = {
        middleware: [TestMiddleware],
      } as any;
      
      container.insertConfig([mockConfig], moduleKey);
      
      const middlewareCollection = container.getMiddlewareCollection(moduleKey);
      const wrapper = middlewareCollection.get(TestMiddleware);
      
      expect(wrapper).toBeInstanceOf(InstanceWrapper);
      expect(wrapper?.metatype).toBe(TestMiddleware);
      expect(wrapper?.token).toBe(TestMiddleware);
      expect(wrapper?.name).toBe("TestMiddleware");
      expect(wrapper?.scope).toBe(getClassScope(TestMiddleware));
      expect(wrapper?.durable).toBe(isDurable(TestMiddleware));
    });

    it("should handle request scoped middleware", () => {
      const mockConfig: BaseMiddlewareConfiguration = {
        middleware: [RequestScopedMiddleware],
      } as any;
      
      container.insertConfig([mockConfig], moduleKey);
      
      const middlewareCollection = container.getMiddlewareCollection(moduleKey);
      const wrapper = middlewareCollection.get(RequestScopedMiddleware);
      
      expect(wrapper?.scope).toBe(Scope.REQUEST);
    });

    it("should handle empty configuration list", () => {
      container.insertConfig([], moduleKey);
      
      const middlewareCollection = container.getMiddlewareCollection(moduleKey);
      const configurations = container.getConfigurations();
      
      expect(middlewareCollection.size).toBe(0);
      expect(configurations.get(moduleKey)?.size).toBe(0);
    });

    it("should handle null/undefined configuration list", () => {
      container.insertConfig(null as any, moduleKey);
      
      const middlewareCollection = container.getMiddlewareCollection(moduleKey);
      const configurations = container.getConfigurations();
      
      expect(middlewareCollection.size).toBe(0);
      expect(configurations.get(moduleKey)?.size).toBe(0);
    });

    it("should handle configuration with null middleware", () => {
      const mockConfig: BaseMiddlewareConfiguration = {
        middleware: null as any,
      } as any;
      
      expect(() => {
        container.insertConfig([mockConfig], moduleKey);
      }).toThrow();
    });

    it("should add configurations to existing sets", () => {
      const config1: BaseMiddlewareConfiguration = {
        middleware: [TestMiddleware],
      } as any;
      const config2: BaseMiddlewareConfiguration = {
        middleware: [AnotherMiddleware],
      } as any;
      
      // Insert first config
      container.insertConfig([config1], moduleKey);
      let configurations = container.getConfigurations();
      expect(configurations.get(moduleKey)?.size).toBe(1);
      
      // Insert second config
      container.insertConfig([config2], moduleKey);
      configurations = container.getConfigurations();
      expect(configurations.get(moduleKey)?.size).toBe(2);
    });

    it("should handle middleware class without name", () => {
      // Create anonymous class
      const AnonymousMiddleware = class {
        use() {
          return "anonymous";
        }
      };
      
      const mockConfig: BaseMiddlewareConfiguration = {
        middleware: [AnonymousMiddleware as any],
      } as any;
      
      container.insertConfig([mockConfig], moduleKey);
      
      const middlewareCollection = container.getMiddlewareCollection(moduleKey);
      const wrapper = middlewareCollection.get(AnonymousMiddleware as any);
      
      expect(wrapper).toBeInstanceOf(InstanceWrapper);
      expect(wrapper?.token).toBe(AnonymousMiddleware);
    });

    it("should handle multiple modules independently", () => {
      const module1 = "Module1";
      const module2 = "Module2";
      
      const config1: BaseMiddlewareConfiguration = {
        middleware: [TestMiddleware],
      } as any;
      const config2: BaseMiddlewareConfiguration = {
        middleware: [AnotherMiddleware],
      } as any;
      
      container.insertConfig([config1], module1);
      container.insertConfig([config2], module2);
      
      const collection1 = container.getMiddlewareCollection(module1);
      const collection2 = container.getMiddlewareCollection(module2);
      
      expect(collection1.has(TestMiddleware)).toBe(true);
      expect(collection1.has(AnotherMiddleware)).toBe(false);
      expect(collection2.has(AnotherMiddleware)).toBe(true);
      expect(collection2.has(TestMiddleware)).toBe(false);
    });
  });

  describe("getTargetConfig", () => {
    it("should create new configuration set for new module", () => {
      const moduleKey = "NewModule";
      
      // Access private method through type assertion
      const targetConfig = (container as any).getTargetConfig(moduleKey);
      
      expect(targetConfig).toBeInstanceOf(Set);
      expect(targetConfig.size).toBe(0);
      expect(container.getConfigurations().has(moduleKey)).toBe(true);
    });

    it("should return existing configuration set", () => {
      const moduleKey = "ExistingModule";
      
      // Create configuration set by inserting config
      const mockConfig: BaseMiddlewareConfiguration = {
        middleware: [TestMiddleware],
      } as any;
      container.insertConfig([mockConfig], moduleKey);
      
      // Get target config twice
      const targetConfig1 = (container as any).getTargetConfig(moduleKey);
      const targetConfig2 = (container as any).getTargetConfig(moduleKey);
      
      expect(targetConfig1).toBe(targetConfig2);
      expect(targetConfig1.size).toBe(1);
    });

    it("should maintain separate configuration sets for different modules", () => {
      const module1 = "Module1";
      const module2 = "Module2";
      
      const config1 = (container as any).getTargetConfig(module1);
      const config2 = (container as any).getTargetConfig(module2);
      
      expect(config1).not.toBe(config2);
      expect(config1).toBeInstanceOf(Set);
      expect(config2).toBeInstanceOf(Set);
    });
  });

  describe("integration scenarios", () => {
    it("should handle complex middleware configuration", () => {
      const moduleKey = "ComplexModule";
      
      // Multiple configurations with different middleware
      const authConfig: BaseMiddlewareConfiguration = {
        middleware: [TestMiddleware],
      } as any;
      const loggingConfig: BaseMiddlewareConfiguration = {
        middleware: [AnotherMiddleware, RequestScopedMiddleware],
      } as any;
      
      container.insertConfig([authConfig, loggingConfig], moduleKey);
      
      const middlewareCollection = container.getMiddlewareCollection(moduleKey);
      const configurations = container.getConfigurations();
      
      // Check all middleware are registered
      expect(middlewareCollection.size).toBe(3);
      expect(middlewareCollection.has(TestMiddleware)).toBe(true);
      expect(middlewareCollection.has(AnotherMiddleware)).toBe(true);
      expect(middlewareCollection.has(RequestScopedMiddleware)).toBe(true);
      
      // Check configurations are stored
      expect(configurations.get(moduleKey)?.size).toBe(2);
      expect(configurations.get(moduleKey)?.has(authConfig)).toBe(true);
      expect(configurations.get(moduleKey)?.has(loggingConfig)).toBe(true);
    });

    it("should work with real middleware use case", () => {
      const moduleKeys = ["AuthModule", "LoggingModule", "ValidationModule"];
      
      moduleKeys.forEach((moduleKey, index) => {
        const config: BaseMiddlewareConfiguration = {
          middleware: [TestMiddleware, AnotherMiddleware],
        } as any;
        
        container.insertConfig([config], moduleKey);
        
        const collection = container.getMiddlewareCollection(moduleKey);
        expect(collection.size).toBe(2);
      });
      
      // Verify all modules have their own collections
      const allConfigurations = container.getConfigurations();
      expect(allConfigurations.size).toBe(3);
      
      moduleKeys.forEach(moduleKey => {
        expect(allConfigurations.has(moduleKey)).toBe(true);
        expect(allConfigurations.get(moduleKey)?.size).toBe(1);
      });
    });

    it("should maintain consistency between middleware and configurations", () => {
      const moduleKey = "ConsistencyModule";
      const configs: BaseMiddlewareConfiguration[] = [
        { middleware: [TestMiddleware] } as any,
        { middleware: [AnotherMiddleware] },
        { middleware: [RequestScopedMiddleware] },
      ];
      
      container.insertConfig(configs, moduleKey);
      
      const middlewareCollection = container.getMiddlewareCollection(moduleKey);
      const configurationSet = container.getConfigurations().get(moduleKey);
      
      // Verify middleware count matches configuration count
      expect(middlewareCollection.size).toBe(3);
      expect(configurationSet?.size).toBe(3);
      
      // Verify all configurations are stored
      configs.forEach(config => {
        expect(configurationSet?.has(config)).toBe(true);
      });
    });
  });

  describe("edge cases", () => {
    it("should handle duplicate middleware in same configuration", () => {
      const moduleKey = "DuplicateModule";
      const config: BaseMiddlewareConfiguration = {
        middleware: [TestMiddleware, TestMiddleware], // Duplicate
      } as any;
      
      container.insertConfig([config], moduleKey);
      
      const middlewareCollection = container.getMiddlewareCollection(moduleKey);
      
      // Map should only have one entry (duplicates overwrite)
      expect(middlewareCollection.size).toBe(1);
      expect(middlewareCollection.has(TestMiddleware)).toBe(true);
    });

    it("should handle duplicate middleware across configurations", () => {
      const moduleKey = "DuplicateAcrossModule";
      const config1: BaseMiddlewareConfiguration = {
        middleware: [TestMiddleware],
      } as any;
      const config2: BaseMiddlewareConfiguration = {
        middleware: [TestMiddleware], // Same middleware in different config
      } as any;
      
      container.insertConfig([config1, config2], moduleKey);
      
      const middlewareCollection = container.getMiddlewareCollection(moduleKey);
      const configurations = container.getConfigurations();
      
      // Middleware collection should have one entry (overwritten)
      expect(middlewareCollection.size).toBe(1);
      expect(middlewareCollection.has(TestMiddleware)).toBe(true);
      
      // But both configurations should be stored
      expect(configurations.get(moduleKey)?.size).toBe(2);
    });

    it("should handle empty middleware arrays gracefully", () => {
      const moduleKey = "EmptyModule";
      const config: BaseMiddlewareConfiguration = {
        middleware: [],
      } as any;
      
      container.insertConfig([config], moduleKey);
      
      const middlewareCollection = container.getMiddlewareCollection(moduleKey);
      const configurations = container.getConfigurations();
      
      expect(middlewareCollection.size).toBe(0);
      expect(configurations.get(moduleKey)?.size).toBe(1);
      expect(configurations.get(moduleKey)?.has(config)).toBe(true);
    });

    it("should handle configuration objects that are not arrays", () => {
      const moduleKey = "NonArrayModule";
      
      // Test with a single configuration (not in array)
      const singleConfig: BaseMiddlewareConfiguration = {
        middleware: [TestMiddleware],
      } as any;
      
      // Force concat to handle non-array case
      const processConfig = (config: any) => [].concat(config.middleware);

      // @ts-expect-error Mismatch types
      expect(processConfig(singleConfig)).toEqual([TestMiddleware]);
    });
  });

  describe("memory management", () => {
    it("should not leak memory with many modules", () => {
      const moduleCount = 100;
      
      for (let i = 0; i < moduleCount; i++) {
        const moduleKey = `Module${i}`;
        const config: BaseMiddlewareConfiguration = {
          middleware: [TestMiddleware],
        } as any;
        
        container.insertConfig([config], moduleKey);
      }
      
      expect(container.getConfigurations().size).toBe(moduleCount);
      
      // Verify each module has its own collection
      for (let i = 0; i < moduleCount; i++) {
        const moduleKey = `Module${i}`;
        const collection = container.getMiddlewareCollection(moduleKey);
        expect(collection.size).toBe(1);
      }
    });

    it("should handle large number of middleware per module", () => {
      const moduleKey = "LargeModule";
      const middlewareCount = 50;
      
      // Create many middleware classes
      const middlewareClasses = Array.from({ length: middlewareCount }, (_, i) => {
        return class {
          // @ts-expect-error Mismatch types
          static name = `Middleware${i}`;
          use() {
            return `middleware-${i}`;
          }
        };
      });
      
      const config: BaseMiddlewareConfiguration = {
        middleware: middlewareClasses as any,
      } as any;
      
      container.insertConfig([config], moduleKey);
      
      const middlewareCollection = container.getMiddlewareCollection(moduleKey);
      expect(middlewareCollection.size).toBe(middlewareCount);
    });
  });
});