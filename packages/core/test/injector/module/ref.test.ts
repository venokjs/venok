import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

import { ModuleRef } from "~/injector/module/ref.js";
import { VenokContainer } from "~/injector/container.js";
import { Module } from "~/injector/module/module.js";
import { InstanceLinksHost } from "~/injector/instance/links-host.js";
import { InstanceWrapper } from "~/injector/instance/wrapper.js";
import { Injector } from "~/injector/injector.js";
import { Scope } from "~/enums/scope.enum.js";
import { Injectable } from "~/decorators/injectable.decorator.js";

// Create a concrete implementation of the abstract ModuleRef for testing
class TestModuleRef extends ModuleRef {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public get<TInput = any, TResult = TInput>(typeOrToken: any, options?: any): TResult | Array<TResult> {
    return {} as any;
  }

  public async resolve<TInput = any, TResult = TInput>(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    typeOrToken: any,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    contextId?: any,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options?: any
  ): Promise<TResult | Array<TResult>> {
    return {} as any;
  }

  public async create<T = any>(type: any, contextId?: any): Promise<T> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.instantiateClass(type, {} as Module, contextId);
  }
}

describe("ModuleRef", () => {
  let moduleRef: TestModuleRef;
  let container: VenokContainer;
  let mockModule: Module;

  @Injectable()
  class TestModule {}

  @Injectable()
  class TestProvider {
    constructor(public dependency?: any) {}
  }

  @Injectable()
  class TestDependency {}

  beforeEach(() => {
    container = new VenokContainer();
    moduleRef = new TestModuleRef(container);
    mockModule = new Module(TestModule, container);
  });

  describe("constructor", () => {
    it("should initialize with container", () => {
      expect((moduleRef as any).container).toBe(container);
      expect((moduleRef as any).injector).toBeInstanceOf(Injector);
    });
  });

  describe("instanceLinksHost getter", () => {
    it("should lazily create InstanceLinksHost", () => {
      const instanceLinksHost = (moduleRef as any).instanceLinksHost;
      
      expect(instanceLinksHost).toBeInstanceOf(InstanceLinksHost);
      expect((moduleRef as any)._instanceLinksHost).toBe(instanceLinksHost);
    });

    it("should return the same instance on multiple calls", () => {
      const instanceLinksHost1 = (moduleRef as any).instanceLinksHost;
      const instanceLinksHost2 = (moduleRef as any).instanceLinksHost;
      
      expect(instanceLinksHost1).toBe(instanceLinksHost2);
    });
  });

  describe("introspect", () => {
    it("should return DEFAULT scope for static dependencies", () => {
      const mockWrapper = {
        isDependencyTreeStatic: () => true,
        isTransient: false,
      } as any;

      const mockLinksHost = {
        get: () => ({ wrapperRef: mockWrapper }),
      };

      // Mock the instanceLinksHost getter using defineProperty
      Object.defineProperty(moduleRef, "instanceLinksHost", {
        get: () => mockLinksHost,
        configurable: true,
      });

      const result = moduleRef.introspect("test-token");

      expect(result.scope).toBe(Scope.DEFAULT);
    });

    it("should return REQUEST scope for non-static dependencies", () => {
      const mockWrapper = {
        isDependencyTreeStatic: () => false,
        isTransient: false,
      } as any;

      const mockLinksHost = {
        get: () => ({ wrapperRef: mockWrapper }),
      };

      Object.defineProperty(moduleRef, "instanceLinksHost", {
        get: () => mockLinksHost,
        configurable: true,
      });

      const result = moduleRef.introspect("test-token");

      expect(result.scope).toBe(Scope.REQUEST);
    });

    it("should return TRANSIENT scope for transient dependencies", () => {
      const mockWrapper = {
        isDependencyTreeStatic: () => true,
        isTransient: true,
      } as any;

      const mockLinksHost = {
        get: () => ({ wrapperRef: mockWrapper }),
      };

      Object.defineProperty(moduleRef, "instanceLinksHost", {
        get: () => mockLinksHost,
        configurable: true,
      });

      const result = moduleRef.introspect("test-token");

      expect(result.scope).toBe(Scope.TRANSIENT);
    });

    it("should call instanceLinksHost.get with correct token", () => {
      const mockLinksHost = {
        get: mock(() => ({
          wrapperRef: {
            isDependencyTreeStatic: () => true,
            isTransient: false,
          },
        })),
      };

      Object.defineProperty(moduleRef, "instanceLinksHost", {
        get: () => mockLinksHost,
        configurable: true,
      });

      moduleRef.introspect("test-token");

      expect(mockLinksHost.get).toHaveBeenCalledWith("test-token");
    });
  });

  describe("instantiateClass", () => {
    it("should create instance of class with no dependencies", async () => {
      const injector = (moduleRef as any).injector;
      spyOn(injector, "resolveConstructorParams").mockImplementation(async (wrapper: any, moduleRef: any, moduleClass: any, callback: any) => {
        await callback([]);
      });
      spyOn(injector, "resolveProperties").mockResolvedValue({});
      spyOn(injector, "applyProperties").mockImplementation(() => {});

      const result = await (moduleRef as any).instantiateClass(TestProvider, mockModule);

      expect(result).toBeInstanceOf(TestProvider);
      expect(injector.resolveConstructorParams).toHaveBeenCalled();
      expect(injector.resolveProperties).toHaveBeenCalled();
      expect(injector.applyProperties).toHaveBeenCalled();
    });

    it("should create instance of class with dependencies", async () => {
      const mockDependency = new TestDependency();
      const injector = (moduleRef as any).injector;
      
      spyOn(injector, "resolveConstructorParams").mockImplementation(async (wrapper: any, moduleRef: any, moduleClass: any, callback: any) => {
        await callback([mockDependency]);
      });
      spyOn(injector, "resolveProperties").mockResolvedValue({});
      spyOn(injector, "applyProperties").mockImplementation(() => {});

      const result = await (moduleRef as any).instantiateClass(TestProvider, mockModule);

      expect(result).toBeInstanceOf(TestProvider);
      expect(result.dependency).toBe(mockDependency);
    });

    it("should apply properties to the instance", async () => {
      const mockProperties = { prop1: "value1", prop2: "value2" };
      const injector = (moduleRef as any).injector;
      
      spyOn(injector, "resolveConstructorParams").mockImplementation(async (wrapper: any, moduleRef: any, moduleClass: any, callback: any) => {
        await callback([]);
      });
      spyOn(injector, "resolveProperties").mockResolvedValue(mockProperties);
      const applyPropertiesSpy = spyOn(injector, "applyProperties").mockImplementation(() => {});

      const result = await (moduleRef as any).instantiateClass(TestProvider, mockModule);

      expect(injector.resolveProperties).toHaveBeenCalled();
      expect(applyPropertiesSpy).toHaveBeenCalledWith(result, mockProperties);
    });

    it("should pass contextId to injector methods", async () => {
      const contextId = { id: 123 };
      const injector = (moduleRef as any).injector;
      
      const resolveConstructorParamsSpy = spyOn(injector, "resolveConstructorParams").mockImplementation(async (wrapper: any, moduleRef: any, moduleClass: any, callback: any) => {
        await callback([]);
      });
      const resolvePropertiesSpy = spyOn(injector, "resolveProperties").mockResolvedValue({});
      spyOn(injector, "applyProperties").mockImplementation(() => {});

      await (moduleRef as any).instantiateClass(TestProvider, mockModule, contextId);

      expect(resolveConstructorParamsSpy).toHaveBeenCalledWith(
        expect.any(InstanceWrapper),
        mockModule,
        null,
        expect.any(Function),
        contextId
      );
      expect(resolvePropertiesSpy).toHaveBeenCalledWith(
        expect.any(InstanceWrapper),
        mockModule,
        undefined,
        contextId
      );
    });

    it("should create proper InstanceWrapper for the type", async () => {
      const injector = (moduleRef as any).injector;
      let capturedWrapper: InstanceWrapper;
      
      spyOn(injector, "resolveConstructorParams").mockImplementation(async (wrapper: any, moduleRef: any, moduleClass: any, callback: any) => {
        capturedWrapper = wrapper;
        await callback([]);
      });
      spyOn(injector, "resolveProperties").mockResolvedValue({});
      spyOn(injector, "applyProperties").mockImplementation(() => {});

      await (moduleRef as any).instantiateClass(TestProvider, mockModule);

      expect(capturedWrapper!.name).toBe("TestProvider");
      expect(capturedWrapper!.metatype).toBe(TestProvider);
      expect(capturedWrapper!.host).toBe(mockModule);
      // isResolved might be undefined initially, which is fine
      // @ts-expect-error Mismatch types
      expect(capturedWrapper!.isResolved).toBeFalsy();
    });

    it("should reject promise when error occurs in constructor resolution", async () => {
      const injector = (moduleRef as any).injector;
      const error = new Error("Constructor resolution failed");
      
      spyOn(injector, "resolveConstructorParams").mockRejectedValue(error);

      await expect((moduleRef as any).instantiateClass(TestProvider, mockModule))
        .rejects.toThrow("Constructor resolution failed");
    });

    it("should reject promise when error occurs in property resolution", async () => {
      const injector = (moduleRef as any).injector;
      const error = new Error("Property resolution failed");
      
      spyOn(injector, "resolveConstructorParams").mockImplementation(async (wrapper: any, moduleRef: any, moduleClass: any, callback: any) => {
        await callback([]);
      });
      spyOn(injector, "resolveProperties").mockRejectedValue(error);

      await expect((moduleRef as any).instantiateClass(TestProvider, mockModule))
        .rejects.toThrow("Property resolution failed");
    });

    it("should handle class without name property", async () => {
      const AnonymousClass = function () {} as any;
      AnonymousClass.prototype = TestProvider.prototype;
      
      const injector = (moduleRef as any).injector;
      spyOn(injector, "resolveConstructorParams").mockImplementation(async (wrapper: any, moduleRef: any, moduleClass: any, callback: any) => {
        await callback([]);
      });
      spyOn(injector, "resolveProperties").mockResolvedValue({});
      spyOn(injector, "applyProperties").mockImplementation(() => {});

      const result = await (moduleRef as any).instantiateClass(AnonymousClass, mockModule);

      expect(result).toBeInstanceOf(AnonymousClass);
    });
  });

  describe("abstract methods", () => {
    it("should have abstract get method", () => {
      expect(typeof moduleRef.get).toBe("function");
    });

    it("should have abstract resolve method", () => {
      expect(typeof moduleRef.resolve).toBe("function");
    });

    it("should have abstract create method", () => {
      expect(typeof moduleRef.create).toBe("function");
    });
  });
});