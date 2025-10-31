import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

import { AbstractInstanceResolver } from "~/injector/instance/resolver.js";
import { InstanceLinksHost } from "~/injector/instance/links-host.js";
import { Injector } from "~/injector/injector.js";
import { Module } from "~/injector/module/module.js";
import { InvalidClassScopeException } from "~/errors/exceptions/invalid-class-scope.exception.js";
import { UnknownElementException } from "~/errors/exceptions/unknown-element.exception.js";
import { Scope } from "~/enums/scope.enum.js";
import { Injectable } from "~/decorators/injectable.decorator.js";

// Create a concrete implementation of AbstractInstanceResolver for testing
class TestInstanceResolver extends AbstractInstanceResolver {
  protected instanceLinksHost: InstanceLinksHost;
  protected injector: Injector;

  constructor(instanceLinksHost: InstanceLinksHost, injector: Injector) {
    super();
    this.instanceLinksHost = instanceLinksHost;
    this.injector = injector;
  }

  protected get<TInput = any, TResult = TInput>(
    typeOrToken: any,
    options?: any
  ): TResult | Array<TResult> {
    return {} as any;
  }

  // Expose protected methods for testing
  public testFind<TInput = any, TResult = TInput>(
    typeOrToken: any,
    options: { moduleId?: string; each?: boolean }
  ): TResult | Array<TResult> {
    return this.find(typeOrToken, options);
  }

  public testResolvePerContext<TInput = any, TResult = TInput>(
    typeOrToken: any,
    contextModule: Module,
    contextId: any,
    options?: any
  ): Promise<TResult | Array<TResult>> {
    return this.resolvePerContext(typeOrToken, contextModule, contextId, options);
  }
}

describe("AbstractInstanceResolver", () => {
  let resolver: TestInstanceResolver;
  let mockInstanceLinksHost: InstanceLinksHost;
  let mockInjector: Injector;
  let mockModule: Module;

  @Injectable()
  class TestProvider {}

  beforeEach(() => {
    mockInstanceLinksHost = {
      get: mock(),
    } as any;

    mockInjector = {
      loadPerContext: mock(),
    } as any;

    mockModule = {
      id: "test-module-id",
    } as any;

    resolver = new TestInstanceResolver(mockInstanceLinksHost, mockInjector);
  });

  describe("find", () => {
    it("should return instance from wrapper with DEFAULT scope", () => {
      const mockInstance = new TestProvider();
      const mockWrapper = {
        scope: Scope.DEFAULT,
        instance: mockInstance,
      };
      const mockInstanceLink = {
        wrapperRef: mockWrapper,
      };

      // @ts-expect-error Mismatch types
      spyOn(mockInstanceLinksHost, "get").mockReturnValue(mockInstanceLink);

      const result = resolver.testFind(TestProvider, {});

      expect(mockInstanceLinksHost.get).toHaveBeenCalledWith(TestProvider, {});
      expect(result).toBe(mockInstance);
    });

    it("should throw InvalidClassScopeException for REQUEST scope", () => {
      const mockWrapper = {
        scope: Scope.REQUEST,
        instance: new TestProvider(),
      };
      const mockInstanceLink = {
        wrapperRef: mockWrapper,
      };

      // @ts-expect-error Mismatch types
      spyOn(mockInstanceLinksHost, "get").mockReturnValue(mockInstanceLink);

      expect(() => resolver.testFind(TestProvider, {})).toThrow(InvalidClassScopeException);
    });

    it("should throw InvalidClassScopeException for TRANSIENT scope", () => {
      const mockWrapper = {
        scope: Scope.TRANSIENT,
        instance: new TestProvider(),
      };
      const mockInstanceLink = {
        wrapperRef: mockWrapper,
      };

      // @ts-expect-error Mismatch types
      spyOn(mockInstanceLinksHost, "get").mockReturnValue(mockInstanceLink);

      expect(() => resolver.testFind(TestProvider, {})).toThrow(InvalidClassScopeException);
    });

    it("should return array of instances when instanceLinksHost returns array", () => {
      const mockInstance1 = new TestProvider();
      const mockInstance2 = new TestProvider();
      const mockWrapper1 = {
        scope: Scope.DEFAULT,
        instance: mockInstance1,
      };
      const mockWrapper2 = {
        scope: Scope.DEFAULT,
        instance: mockInstance2,
      };
      const mockInstanceLinks = [
        { wrapperRef: mockWrapper1 },
        { wrapperRef: mockWrapper2 },
      ];

      // @ts-expect-error Mismatch types
      spyOn(mockInstanceLinksHost, "get").mockReturnValue(mockInstanceLinks);

      const result = resolver.testFind(TestProvider, { each: true });

      expect(Array.isArray(result)).toBe(true);
      expect((result as any[]).length).toBe(2);
      expect((result as any[])[0]).toBe(mockInstance1);
      expect((result as any[])[1]).toBe(mockInstance2);
    });

    it("should pass options to instanceLinksHost.get", () => {
      const options = { moduleId: "test-module", each: true };
      const mockInstanceLink = {
        wrapperRef: {
          scope: Scope.DEFAULT,
          instance: new TestProvider(),
        },
      };

      // @ts-expect-error Mismatch types
      spyOn(mockInstanceLinksHost, "get").mockReturnValue([mockInstanceLink]);

      resolver.testFind(TestProvider, options);

      expect(mockInstanceLinksHost.get).toHaveBeenCalledWith(TestProvider, options);
    });
  });

  describe("resolvePerContext", () => {
    const contextId = { id: 123 };

    it("should call get method when dependency tree is static and not transient", async () => {
      const mockInstance = new TestProvider();
      const mockWrapper = {
        isDependencyTreeStatic: () => true,
        isTransient: false,
        instance: mockInstance,
      };
      const mockInstanceLink = {
        wrapperRef: mockWrapper,
        collection: new Map(),
      };

      // @ts-expect-error Mismatch types
      spyOn(mockInstanceLinksHost, "get").mockReturnValue(mockInstanceLink);
      // @ts-expect-error Mismatch types
      const getSpy = spyOn(resolver, "get").mockReturnValue(mockInstance);

      const result = await resolver.testResolvePerContext(TestProvider, mockModule, contextId);

      expect(getSpy).toHaveBeenCalledWith(TestProvider, { strict: undefined });
      expect(result).toBe(mockInstance);
    });

    it("should call get method with strict option when specified", async () => {
      const mockInstance = new TestProvider();
      const mockWrapper = {
        isDependencyTreeStatic: () => true,
        isTransient: false,
        instance: mockInstance,
      };
      const mockInstanceLink = {
        wrapperRef: mockWrapper,
        collection: new Map(),
      };

      // @ts-expect-error Mismatch types
      spyOn(mockInstanceLinksHost, "get").mockReturnValue(mockInstanceLink);
      // @ts-expect-error Mismatch types
      const getSpy = spyOn(resolver, "get").mockReturnValue(mockInstance);

      await resolver.testResolvePerContext(TestProvider, mockModule, contextId, { strict: true });

      expect(getSpy).toHaveBeenCalledWith(TestProvider, { strict: true });
    });

    it("should call injector.loadPerContext when dependency tree is not static", async () => {
      const mockInstance = new TestProvider();
      const mockWrapper = {
        isDependencyTreeStatic: () => false,
        isTransient: false,
        instance: null,
        host: mockModule,
      };
      const mockCollection = new Map();
      const mockInstanceLink = {
        wrapperRef: mockWrapper,
        collection: mockCollection,
      };

      // @ts-expect-error Mismatch types
      spyOn(mockInstanceLinksHost, "get").mockReturnValue(mockInstanceLink);
      spyOn(mockInjector, "loadPerContext").mockResolvedValue(mockInstance);

      const result = await resolver.testResolvePerContext(TestProvider, mockModule, contextId);

      expect(mockInjector.loadPerContext).toHaveBeenCalledWith(
        { constructor: TestProvider },
        mockModule,
        mockCollection,
        contextId,
        mockWrapper
      );
      expect(result).toBe(mockInstance);
    });

    it("should call injector.loadPerContext when wrapper is transient", async () => {
      const mockInstance = new TestProvider();
      const mockWrapper = {
        isDependencyTreeStatic: () => true,
        isTransient: true,
        instance: new TestProvider(),
        host: mockModule,
      };
      const mockCollection = new Map();
      const mockInstanceLink = {
        wrapperRef: mockWrapper,
        collection: mockCollection,
      };

      // @ts-expect-error Mismatch types
      spyOn(mockInstanceLinksHost, "get").mockReturnValue(mockInstanceLink);
      spyOn(mockInjector, "loadPerContext").mockResolvedValue(mockInstance);

      const result = await resolver.testResolvePerContext(TestProvider, mockModule, contextId);

      expect(mockInjector.loadPerContext).toHaveBeenCalledWith(
        mockWrapper.instance,
        mockModule,
        mockCollection,
        contextId,
        mockWrapper
      );
      expect(result).toBe(mockInstance);
    });

    it("should use constructor host when wrapper instance is null", async () => {
      const mockInstance = new TestProvider();
      const mockWrapper = {
        isDependencyTreeStatic: () => false,
        isTransient: false,
        instance: null,
        host: mockModule,
      };
      const mockCollection = new Map();
      const mockInstanceLink = {
        wrapperRef: mockWrapper,
        collection: mockCollection,
      };

      // @ts-expect-error Mismatch types
      spyOn(mockInstanceLinksHost, "get").mockReturnValue(mockInstanceLink);
      spyOn(mockInjector, "loadPerContext").mockResolvedValue(mockInstance);

      await resolver.testResolvePerContext(TestProvider, mockModule, contextId);

      expect(mockInjector.loadPerContext).toHaveBeenCalledWith(
        { constructor: TestProvider },
        mockModule,
        mockCollection,
        contextId,
        mockWrapper
      );
    });

    it("should throw UnknownElementException when loadPerContext returns null", async () => {
      const mockWrapper = {
        isDependencyTreeStatic: () => false,
        isTransient: false,
        instance: null,
        host: mockModule,
      };
      const mockInstanceLink = {
        wrapperRef: mockWrapper,
        collection: new Map(),
      };

      // @ts-expect-error Mismatch types
      spyOn(mockInstanceLinksHost, "get").mockReturnValue(mockInstanceLink);
      spyOn(mockInjector, "loadPerContext").mockResolvedValue(null);

      await expect(
        resolver.testResolvePerContext(TestProvider, mockModule, contextId)
      ).rejects.toThrow(UnknownElementException);
    });

    it("should handle array of instance links", async () => {
      const mockInstance1 = new TestProvider();
      const mockInstance2 = new TestProvider();
      const mockWrapper1 = {
        isDependencyTreeStatic: () => false,
        isTransient: false,
        instance: null,
        host: mockModule,
      };
      const mockWrapper2 = {
        isDependencyTreeStatic: () => false,
        isTransient: false,
        instance: null,
        host: mockModule,
      };
      const mockInstanceLinks = [
        { wrapperRef: mockWrapper1, collection: new Map() },
        { wrapperRef: mockWrapper2, collection: new Map() },
      ];

      // @ts-expect-error Mismatch types
      spyOn(mockInstanceLinksHost, "get").mockReturnValue(mockInstanceLinks);
      spyOn(mockInjector, "loadPerContext")
        .mockResolvedValueOnce(mockInstance1)
        .mockResolvedValueOnce(mockInstance2);

      const result = await resolver.testResolvePerContext(TestProvider, mockModule, contextId);

      expect(Array.isArray(result)).toBe(true);
      expect((result as any[]).length).toBe(2);
      expect((result as any[])[0]).toBe(mockInstance1);
      expect((result as any[])[1]).toBe(mockInstance2);
    });

    it("should use strict mode with moduleId when strict option is true", async () => {
      const mockWrapper = {
        isDependencyTreeStatic: () => true,
        isTransient: false,
        instance: new TestProvider(),
      };
      const mockInstanceLink = {
        wrapperRef: mockWrapper,
        collection: new Map(),
      };

      // @ts-expect-error Mismatch types
      spyOn(mockInstanceLinksHost, "get").mockReturnValue(mockInstanceLink);
      // @ts-expect-error Mismatch types
      spyOn(resolver, "get").mockReturnValue(new TestProvider());

      await resolver.testResolvePerContext(TestProvider, mockModule, contextId, { strict: true });

      expect(mockInstanceLinksHost.get).toHaveBeenCalledWith(TestProvider, {
        moduleId: "test-module-id",
        each: undefined,
      });
    });

    it("should use non-strict mode when strict option is false", async () => {
      const mockWrapper = {
        isDependencyTreeStatic: () => false,
        isTransient: false,
        instance: null,
        host: mockModule,
      };
      const mockInstanceLink = {
        wrapperRef: mockWrapper,
        collection: new Map(),
      };

      // @ts-expect-error Mismatch types
      spyOn(mockInstanceLinksHost, "get").mockReturnValue(mockInstanceLink);
      spyOn(mockInjector, "loadPerContext").mockResolvedValue(new TestProvider());

      await resolver.testResolvePerContext(TestProvider, mockModule, contextId, { strict: false });

      expect(mockInstanceLinksHost.get).toHaveBeenCalledWith(TestProvider, {
        each: false,
      });
    });

    it("should handle each option correctly in strict mode", async () => {
      const mockWrapper = {
        isDependencyTreeStatic: () => false,
        isTransient: false,
        instance: null,
        host: mockModule,
      };
      const mockInstanceLink = {
        wrapperRef: mockWrapper,
        collection: new Map(),
      };

      // @ts-expect-error Mismatch types
      spyOn(mockInstanceLinksHost, "get").mockReturnValue([mockInstanceLink]);
      spyOn(mockInjector, "loadPerContext").mockResolvedValue(new TestProvider());

      await resolver.testResolvePerContext(TestProvider, mockModule, contextId, { 
        strict: true, 
        each: true, 
      });

      expect(mockInstanceLinksHost.get).toHaveBeenCalledWith(TestProvider, {
        moduleId: "test-module-id",
        each: true,
      });
    });

    it("should handle each option correctly in non-strict mode", async () => {
      const mockWrapper = {
        isDependencyTreeStatic: () => false,
        isTransient: false,
        instance: null,
        host: mockModule,
      };
      const mockInstanceLink = {
        wrapperRef: mockWrapper,
        collection: new Map(),
      };

      // @ts-expect-error Mismatch types
      spyOn(mockInstanceLinksHost, "get").mockReturnValue([mockInstanceLink]);
      spyOn(mockInjector, "loadPerContext").mockResolvedValue(new TestProvider());

      await resolver.testResolvePerContext(TestProvider, mockModule, contextId, { each: true });

      expect(mockInstanceLinksHost.get).toHaveBeenCalledWith(TestProvider, {
        each: true,
      });
    });

    it("should handle undefined options gracefully", async () => {
      const mockWrapper = {
        isDependencyTreeStatic: () => false,
        isTransient: false,
        instance: null,
        host: mockModule,
      };
      const mockInstanceLink = {
        wrapperRef: mockWrapper,
        collection: new Map(),
      };

      // @ts-expect-error Mismatch types
      spyOn(mockInstanceLinksHost, "get").mockReturnValue(mockInstanceLink);
      spyOn(mockInjector, "loadPerContext").mockResolvedValue(new TestProvider());

      await resolver.testResolvePerContext(TestProvider, mockModule, contextId, undefined);

      expect(mockInstanceLinksHost.get).toHaveBeenCalledWith(TestProvider, {
        each: false,
      });
    });
  });

  describe("abstract methods", () => {
    it("should have abstract get method", () => {
      // @ts-expect-error Mismatch types
      expect(typeof resolver.get).toBe("function");
    });
  });

  describe("integration with real dependencies", () => {
    it("should work with proper mock setup", async () => {
      const mockWrapper = {
        scope: Scope.DEFAULT,
        instance: new TestProvider(),
      };
      const mockInstanceLink = {
        wrapperRef: mockWrapper,
      };

      // @ts-expect-error Mismatch types
      spyOn(mockInstanceLinksHost, "get").mockReturnValue(mockInstanceLink);

      const result = resolver.testFind(TestProvider, {});
      expect(result).toBeInstanceOf(TestProvider);
    });
  });
});