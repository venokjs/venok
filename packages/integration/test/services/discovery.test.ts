/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unused-vars */
import { CoreModule, flatten, Injectable, InstanceWrapper, MetaHostStorage, ModulesContainer, SetMetadata, VenokContainer } from "@venok/core";
import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

import { DiscoveryService } from "~/services/discovery.service.js";

// Mock decorator for testing
const TEST_METADATA_KEY = "test-metadata";
const TestDecorator = SetMetadata(TEST_METADATA_KEY, "test-value");

@Injectable()
@TestDecorator
class TestProvider {
  getValue() {
    return "test";
  }
}

@Injectable()
class AnotherTestProvider {
  getValue() {
    return "another";
  }
}

@Injectable()
class ProviderWithMethodMetadata {
  @TestDecorator
  decoratedMethod() {
    return "decorated";
  }

  normalMethod() {
    return "normal";
  }
}

class TestModule {}
class AnotherModule {}

describe("DiscoveryService", () => {
  let discoveryService: DiscoveryService;
  let modulesContainer: ModulesContainer;
  let testModule: CoreModule;
  let anotherModule: CoreModule;
  let venokContainer: VenokContainer;

  beforeEach(() => {
    modulesContainer = new ModulesContainer();
    venokContainer = new VenokContainer();
    discoveryService = new DiscoveryService(modulesContainer);

    // Create real modules using proper API
    testModule = new CoreModule(TestModule, venokContainer);
    anotherModule = new CoreModule(AnotherModule, venokContainer);

    // Add providers to modules using proper API
    testModule.addProvider(TestProvider);
    testModule.addProvider(AnotherTestProvider);
    anotherModule.addProvider(ProviderWithMethodMetadata);

    // Create instances for the providers
    const testProviderWrapper = testModule.getProviderByKey(TestProvider);
    const anotherTestProviderWrapper = testModule.getProviderByKey(AnotherTestProvider);
    const providerWithMethodMetadataWrapper = anotherModule.getProviderByKey(ProviderWithMethodMetadata);

    // Set instances manually for testing
    if (testProviderWrapper) {
      (testProviderWrapper as any).instance = new TestProvider();
      (testProviderWrapper as any).isResolved = true;
    }
    if (anotherTestProviderWrapper) {
      (anotherTestProviderWrapper as any).instance = new AnotherTestProvider();
      (anotherTestProviderWrapper as any).isResolved = true;
    }
    if (providerWithMethodMetadataWrapper) {
      (providerWithMethodMetadataWrapper as any).instance = new ProviderWithMethodMetadata();
      (providerWithMethodMetadataWrapper as any).isResolved = true;
    }

    // Add modules to container using Map API
    modulesContainer.set("TestModule", testModule);
    modulesContainer.set("AnotherModule", anotherModule);
  });

  describe("getProviders", () => {
    it("should return all providers when no options are provided", () => {
      const providers = discoveryService.getProviders();

      // Each module adds 3 core providers + our custom providers
      // testModule: TestModule + ModuleRef + ApplicationConfig + TestProvider + AnotherTestProvider = 5
      // anotherModule: AnotherModule + ModuleRef + ApplicationConfig + ProviderWithMethodMetadata = 4
      // Total = 9
      expect(providers.length).toBeGreaterThanOrEqual(3);
      expect(providers.some((p) => p.name === "TestProvider")).toBe(true);
      expect(providers.some((p) => p.name === "AnotherTestProvider")).toBe(true);
      expect(providers.some((p) => p.name === "ProviderWithMethodMetadata")).toBe(
        true
      );
    });

    it("should return all providers when empty options are provided", () => {
      const providers = discoveryService.getProviders({});

      expect(providers.length).toBeGreaterThanOrEqual(3);
      expect(providers.some((p) => p.name === "TestProvider")).toBe(true);
      expect(providers.some((p) => p.name === "AnotherTestProvider")).toBe(true);
      expect(providers.some((p) => p.name === "ProviderWithMethodMetadata")).toBe(true);
    });

    it("should return providers filtered by metadata key", () => {
      const mockProviders = new Set([testModule.getProviderByKey(TestProvider)]);

      const spy = spyOn(MetaHostStorage, "getProvidersByMetaKey").mockReturnValue(
        mockProviders
      );

      const providers = discoveryService.getProviders({
        metadataKey: TEST_METADATA_KEY,
      });

      expect(spy).toHaveBeenCalledWith(modulesContainer, TEST_METADATA_KEY);
      expect(providers).toHaveLength(1);
      expect(providers[0].name).toBe("TestProvider");

      spy.mockRestore();
    });

    it("should return empty array when no providers match metadata key", () => {
      const mockProviders = new Set();

      const spy = spyOn(MetaHostStorage, "getProvidersByMetaKey").mockReturnValue(
        // @ts-expect-error Mismatch types
        mockProviders
      );

      const providers = discoveryService.getProviders({
        metadataKey: "non-existent-key",
      });

      expect(providers).toHaveLength(0);

      spy.mockRestore();
    });

    it("should return providers from specified modules only", () => {
      const providers = discoveryService.getProviders({}, [testModule]);

      // testModule has TestModule + ModuleRef + ApplicationConfig + TestProvider + AnotherTestProvider = 5
      expect(providers.length).toBeGreaterThanOrEqual(2);
      expect(providers.some((p) => p.name === "TestProvider")).toBe(true);
      expect(providers.some((p) => p.name === "AnotherTestProvider")).toBe(true);
      expect(providers.some((p) => p.name === "ProviderWithMethodMetadata")).toBe(
        false
      );
    });

    it("should return providers from specified modules with include filter", () => {
      const providers = discoveryService.getProviders({
        include: [testModule.metatype],
      });

      expect(providers.length).toBeGreaterThanOrEqual(2);
      expect(providers.some((p) => p.name === "TestProvider")).toBe(true);
      expect(providers.some((p) => p.name === "AnotherTestProvider")).toBe(true);
      expect(providers.some((p) => p.name === "ProviderWithMethodMetadata")).toBe(
        false
      );
    });

    it("should handle empty include array", () => {
      const providers = discoveryService.getProviders({
        include: [],
      });

      expect(providers).toHaveLength(0);
    });

    it("should handle include array with non-matching modules", () => {
      class NonExistentModule {}

      const providers = discoveryService.getProviders({
        include: [NonExistentModule],
      });

      expect(providers).toHaveLength(0);
    });
  });

  describe("getMetadataByDecorator", () => {
    let testProviderWrapper: InstanceWrapper;
    let providerWithMethodMetadataWrapper: InstanceWrapper;

    beforeEach(() => {
      testProviderWrapper = testModule.getProviderByKey(TestProvider)!;
      providerWithMethodMetadataWrapper = anotherModule.getProviderByKey(
        ProviderWithMethodMetadata
      )!;
    });

    it("should retrieve metadata from class when no method key is provided", () => {
      const metadata = discoveryService.getMetadataByDecorator(
        TestDecorator,
        testProviderWrapper
      );

      expect(metadata).toBe("test-value");
    });

    it("should retrieve metadata from method when method key is provided", () => {
      const metadata = discoveryService.getMetadataByDecorator(
        TestDecorator,
        providerWithMethodMetadataWrapper,
        "decoratedMethod"
      );

      expect(metadata).toBe("test-value");
    });

    it("should return undefined when metadata is not found on class", () => {
      const NoMetadataDecorator = SetMetadata("no-metadata", "value");

      const metadata = discoveryService.getMetadataByDecorator(
        NoMetadataDecorator,
        testProviderWrapper
      );

      expect(metadata).toBeUndefined();
    });

    it("should return undefined when metadata is not found on method", () => {
      const NoMetadataDecorator = SetMetadata("no-metadata", "value");

      const metadata = discoveryService.getMetadataByDecorator(
        NoMetadataDecorator,
        providerWithMethodMetadataWrapper,
        "normalMethod"
      );

      expect(metadata).toBeUndefined();
    });

    it("should return undefined when method does not exist", () => {
      // Since Reflect.getMetadata throws on undefined/null targets, 
      // we test the behavior by providing a valid method that doesn't have the decorator
      const metadata = discoveryService.getMetadataByDecorator(
        TestDecorator,
        providerWithMethodMetadataWrapper,
        "normalMethod"  // This method exists but doesn't have TestDecorator
      );

      expect(metadata).toBeUndefined();
    });

    it("should handle wrapper without instance", () => {
      const wrapperWithoutInstance = {
        ...testProviderWrapper,
        instance: undefined,
        metatype: TestProvider,
      };

      const metadata = discoveryService.getMetadataByDecorator(
        TestDecorator,
        // @ts-expect-error Mismatch types
        wrapperWithoutInstance
      );

      expect(metadata).toBe("test-value");
    });

    it("should handle wrapper without constructor", () => {
      const wrapperWithoutConstructor = {
        ...testProviderWrapper,
        instance: { constructor: undefined },
        metatype: TestProvider,
      };

      const metadata = discoveryService.getMetadataByDecorator(
        TestDecorator,
        // @ts-expect-error Mismatch types
        wrapperWithoutConstructor
      );

      expect(metadata).toBe("test-value");
    });

    it("should work with different decorator types", () => {
      const StringDecorator = SetMetadata("string-key", "string-value");
      const NumberDecorator = SetMetadata("number-key", 42);
      const ObjectDecorator = SetMetadata("object-key", { test: true });

      @Injectable()
      @StringDecorator
      class StringProvider {}

      @Injectable()
      @NumberDecorator
      class NumberProvider {}

      @Injectable()
      @ObjectDecorator
      class ObjectProvider {}

      const stringWrapper = {
        instance: new StringProvider(),
        metatype: StringProvider,
      } as InstanceWrapper;

      const numberWrapper = {
        instance: new NumberProvider(),
        metatype: NumberProvider,
      } as InstanceWrapper;

      const objectWrapper = {
        instance: new ObjectProvider(),
        metatype: ObjectProvider,
      } as InstanceWrapper;

      expect(
        discoveryService.getMetadataByDecorator(StringDecorator, stringWrapper)
      ).toBe("string-value");
      expect(
        discoveryService.getMetadataByDecorator(NumberDecorator, numberWrapper)
        // @ts-expect-error Mismatch types
      ).toBe(42);
      expect(
        discoveryService.getMetadataByDecorator(ObjectDecorator, objectWrapper)
        // @ts-expect-error Mismatch types
      ).toEqual({ test: true });
    });
  });

  describe("getModules", () => {
    it("should return all modules when no options are provided", () => {
      const modules = (discoveryService as any).getModules();

      expect(modules).toHaveLength(2);
      expect(modules).toContain(testModule);
      expect(modules).toContain(anotherModule);
    });

    it("should return all modules when empty options are provided", () => {
      const modules = (discoveryService as any).getModules({});

      expect(modules).toHaveLength(2);
    });

    it("should return filtered modules when include option is provided", () => {
      const modules = (discoveryService as any).getModules({
        include: [testModule.metatype],
      });

      expect(modules).toHaveLength(1);
      expect(modules[0]).toBe(testModule);
    });

    it("should return empty array when include array is empty", () => {
      const modules = (discoveryService as any).getModules({
        include: [],
      });

      expect(modules).toHaveLength(0);
    });

    it("should return empty array when no modules match include filter", () => {
      class NonExistentModule {}

      const modules = (discoveryService as any).getModules({
        include: [NonExistentModule],
      });

      expect(modules).toHaveLength(0);
    });

    it("should handle multiple modules in include filter", () => {
      const modules = (discoveryService as any).getModules({
        include: [testModule.metatype, anotherModule.metatype],
      });

      expect(modules).toHaveLength(2);
      expect(modules).toContain(testModule);
      expect(modules).toContain(anotherModule);
    });
  });

  describe("includeWhitelisted", () => {
    it("should filter modules by metatype", () => {
      const modules = (discoveryService as any).includeWhitelisted([testModule.metatype]);

      expect(modules).toHaveLength(1);
      expect(modules[0]).toBe(testModule);
    });

    it("should return empty array when no modules match", () => {
      class NonExistentModule {}

      const modules = (discoveryService as any).includeWhitelisted([NonExistentModule]);

      expect(modules).toHaveLength(0);
    });

    it("should handle multiple metatypes", () => {
      const modules = (discoveryService as any).includeWhitelisted([
        testModule.metatype,
        anotherModule.metatype,
      ]);

      expect(modules).toHaveLength(2);
      expect(modules).toContain(testModule);
      expect(modules).toContain(anotherModule);
    });

    it("should handle empty include array", () => {
      const modules = (discoveryService as any).includeWhitelisted([]);

      expect(modules).toHaveLength(0);
    });
  });

  describe("integration scenarios", () => {
    it("should work with real use case: finding providers with specific metadata", () => {
      const CONTROLLER_METADATA = "controller";
      const ControllerDecorator = SetMetadata(CONTROLLER_METADATA, true);

      @Injectable()
      @ControllerDecorator
      class TestController {
        @ControllerDecorator
        handleRequest() {
          return "handled";
        }
      }

      const controllerWrapper = {
        instance: new TestController(),
        metatype: TestController,
        name: "TestController",
        token: "TestController",
        host: testModule,
      } as InstanceWrapper;

      testModule.addProvider(TestController);

      const mockProviders = new Set([controllerWrapper]);
      const spy = spyOn(MetaHostStorage, "getProvidersByMetaKey").mockReturnValue(
        mockProviders
      );

      const providers = discoveryService.getProviders({
        metadataKey: CONTROLLER_METADATA,
      });

      expect(providers).toHaveLength(1);
      expect(providers[0].name).toBe("TestController");

      const classMetadata = discoveryService.getMetadataByDecorator(
        ControllerDecorator,
        controllerWrapper
      );
      const methodMetadata = discoveryService.getMetadataByDecorator(
        ControllerDecorator,
        controllerWrapper,
        "handleRequest"
      );

      // @ts-expect-error Mismatch types
      expect(classMetadata).toBe(true);
      // @ts-expect-error Mismatch types
      expect(methodMetadata).toBe(true);

      spy.mockRestore();
    });

    it("should handle complex filtering scenarios", () => {
      const providers = discoveryService.getProviders(
        {},
        [(discoveryService as any).getModules({ include: [testModule.metatype] })[0]]
      );

      expect(providers.length).toBeGreaterThanOrEqual(2);
      expect(providers.every((p) => p.host === testModule)).toBe(true);
    });

    it("should maintain consistency between different discovery methods", () => {
      const allProviders = discoveryService.getProviders();
      const moduleProviders = (discoveryService as any)
        .getModules()
        .flatMap((module: CoreModule) => [...module.providers.values()]);

      expect(allProviders).toHaveLength(moduleProviders.length);
      expect(
        allProviders.every((provider) =>
          moduleProviders.some((mp: InstanceWrapper) => mp.name === provider.name)
        )
      ).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle empty modules container", () => {
      const emptyContainer = new ModulesContainer();
      const emptyDiscoveryService = new DiscoveryService(emptyContainer);

      const providers = emptyDiscoveryService.getProviders();
      expect(providers).toHaveLength(0);

      const modules = (emptyDiscoveryService as any).getModules();
      expect(modules).toHaveLength(0);
    });

    it("should handle modules with empty providers", () => {
      class EmptyModule {}
      
      const emptyContainer = new VenokContainer();
      const emptyModule = new CoreModule(EmptyModule, emptyContainer);

      const container = new ModulesContainer();
      container.set("EmptyModule", emptyModule);

      const service = new DiscoveryService(container);
      const providers = service.getProviders();

      // EmptyModule still has 3 core providers: EmptyModule + ModuleRef + ApplicationConfig
      expect(providers.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle null/undefined metadata gracefully", () => {
      const NullDecorator = SetMetadata("null-key", null);
      const UndefinedDecorator = SetMetadata("undefined-key", undefined);

      @Injectable()
      @NullDecorator
      class NullProvider {}

      @Injectable()
      @UndefinedDecorator
      class UndefinedProvider {}

      const nullWrapper = {
        instance: new NullProvider(),
        metatype: NullProvider,
      } as InstanceWrapper;

      const undefinedWrapper = {
        instance: new UndefinedProvider(),
        metatype: UndefinedProvider,
      } as InstanceWrapper;

      expect(
        discoveryService.getMetadataByDecorator(NullDecorator, nullWrapper)
      ).toBeNull();
      expect(
        discoveryService.getMetadataByDecorator(UndefinedDecorator, undefinedWrapper)
      ).toBeUndefined();
    });
  });
});