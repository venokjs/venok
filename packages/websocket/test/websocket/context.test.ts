/* eslint-disable @typescript-eslint/no-unsafe-argument */
import type { ContextId, ExternalContextOptions, VenokParamsFactoryInterface } from "@venok/core";

import { ApplicationConfig, GuardsConsumer, GuardsContextCreator, InterceptorsConsumer, InterceptorsContextCreator, ModulesContainer, PipesConsumer, PipesContextCreator, STATIC_CONTEXT, VenokContainer, VenokExceptionFilterContext } from "@venok/core";
import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

import { WebsocketContextCreator } from "~/websocket/context.js";
import { MESSAGE_METADATA } from "~/constants.js";

describe("WebsocketContextCreator", () => {
  let contextCreator: WebsocketContextCreator;
  let mockContainer: VenokContainer;

  let testInstance: any;
  let testCallback: any;

  beforeEach(() => {
    const applicationConfig = new ApplicationConfig();
    mockContainer = new VenokContainer(applicationConfig);
    
    const mockGuardsContextCreator = new GuardsContextCreator(mockContainer, applicationConfig);
    const mockGuardsConsumer = new GuardsConsumer();
    const mockInterceptorsContextCreator = new InterceptorsContextCreator(mockContainer, applicationConfig);
    const mockInterceptorsConsumer = new InterceptorsConsumer();
    const mockModulesContainer = new ModulesContainer();
    const mockPipesContextCreator = new PipesContextCreator(mockContainer, applicationConfig);
    const mockPipesConsumer = new PipesConsumer();
    const mockFiltersContextCreator = new VenokExceptionFilterContext(mockContainer, applicationConfig);

    contextCreator = new WebsocketContextCreator(
      mockGuardsContextCreator,
      mockGuardsConsumer,
      mockInterceptorsContextCreator,
      mockInterceptorsConsumer,
      mockModulesContainer,
      mockPipesContextCreator,
      mockPipesConsumer,
      mockFiltersContextCreator
    );

    testInstance = { 
      constructor: class TestClass {},
      testMethod: () => "test result",
    };
    
    testCallback = mock(() => "callback result");
  });

  describe("constructor", () => {
    it("should create instance with all required dependencies", () => {
      expect(contextCreator).toBeInstanceOf(WebsocketContextCreator);
      expect((contextCreator as any).guardsContextCreator).toBeDefined();
      expect((contextCreator as any).guardsConsumer).toBeDefined();
      expect((contextCreator as any).interceptorsContextCreator).toBeDefined();
      expect((contextCreator as any).interceptorsConsumer).toBeDefined();
      expect((contextCreator as any).modulesContainer).toBeDefined();
      expect((contextCreator as any).pipesContextCreator).toBeDefined();
      expect((contextCreator as any).pipesConsumer).toBeDefined();
      // @ts-expect-error Mismatch types
      expect(contextCreator.filtersContextCreator).toBeDefined();
    });

    it("should inherit from VenokContextCreator", () => {
      expect(contextCreator.contextUtils).toBeDefined();
      expect(contextCreator.venokProxy).toBeDefined();
      expect(contextCreator.reflector).toBeDefined();
    });
  });

  describe("create", () => {
    let getContextModuleKeySpy: any;
    let reflectCallbackPatternSpy: any;
    let superCreateSpy: any;
    let filtersCreateSpy: any;
    let venokProxyCreateSpy: any;

    beforeEach(() => {
      getContextModuleKeySpy = spyOn(contextCreator, "getContextModuleKey").mockReturnValue("test-module");
      reflectCallbackPatternSpy = spyOn(contextCreator, "reflectCallbackPattern").mockReturnValue("test-pattern");
      
      superCreateSpy = spyOn(Object.getPrototypeOf(WebsocketContextCreator.prototype), "create").mockReturnValue(
        mock(async () => "super result")
      );

      // @ts-expect-error Mismatch types
      filtersCreateSpy = spyOn(contextCreator.filtersContextCreator, "create").mockReturnValue(
        // @ts-expect-error Mismatch types
        mock(async (exception: any) => {
          if (exception) throw exception;
          return "filtered result";
        })
      );

      venokProxyCreateSpy = spyOn(contextCreator.venokProxy, "createProxy").mockReturnValue(
        mock(async () => "proxy result")
      );
    });

    it("should call getContextModuleKey with instance constructor", () => {
      contextCreator.create(testInstance, testCallback, "testMethod");

      expect(getContextModuleKeySpy).toHaveBeenCalledWith(testInstance.constructor);
    });

    it("should call reflectCallbackPattern with callback", () => {
      contextCreator.create(testInstance, testCallback, "testMethod");

      expect(reflectCallbackPatternSpy).toHaveBeenCalledWith(testCallback);
    });

    it("should call super.create with correct parameters and default options", () => {
      contextCreator.create(testInstance, testCallback, "testMethod");

      expect(superCreateSpy).toHaveBeenCalledWith(
        testInstance,
        testCallback,
        "testMethod",
        undefined, // metadataKey
        undefined, // paramsFactory
        STATIC_CONTEXT, // contextId
        undefined, // inquirerId
        {
          interceptors: true,
          guards: true,
          filters: false,
          callback: undefined,
        }, // options
        "websocket" // contextType
      );
    });

    it("should call super.create with custom parameters", () => {
      const customParamsFactory: VenokParamsFactoryInterface = {
        exchangeKeyForValue: () => "test",
      };
      const customContextId = "custom-context";
      const customOptions: ExternalContextOptions = {
        interceptors: false,
        guards: false,
        filters: true,
        callback: () => {},
      };

      contextCreator.create(
        testInstance,
        testCallback,
        "testMethod",
        "custom-metadata",
        customParamsFactory,
        customContextId as unknown as ContextId,
        "inquirer-id",
        customOptions,
        "custom" as any
      );

      expect(superCreateSpy).toHaveBeenCalledWith(
        testInstance,
        testCallback,
        "testMethod",
        "custom-metadata",
        customParamsFactory,
        customContextId,
        "inquirer-id",
        customOptions,
        "custom"
      );
    });

    it("should create exception filter context", () => {
      contextCreator.create(testInstance, testCallback, "testMethod");

      expect(filtersCreateSpy).toHaveBeenCalledWith(
        testInstance,
        testCallback,
        "test-module",
        STATIC_CONTEXT,
        undefined
      );
    });

    it("should create exception filter context with custom parameters", () => {
      const customContextId = "custom-context";
      const inquirerId = "test-inquirer";

      contextCreator.create(
        testInstance,
        testCallback,
        "testMethod",
        undefined,
        undefined,
        customContextId as unknown as ContextId,
        inquirerId
      );

      expect(filtersCreateSpy).toHaveBeenCalledWith(
        testInstance,
        testCallback,
        "test-module",
        customContextId,
        inquirerId
      );
    });

    it("should return a function", () => {
      const result = contextCreator.create(testInstance, testCallback, "testMethod");

      expect(typeof result).toBe("function");
    });

    describe("returned function", () => {
      it("should call venokProxy.createProxy with super result and exception filter", async () => {
        const returnedFunction = contextCreator.create(testInstance, testCallback, "testMethod");
        
        await returnedFunction(1, 2, 3);

        expect(venokProxyCreateSpy).toHaveBeenCalled();
        
        const proxyCreateCall = venokProxyCreateSpy.mock.calls[0];
        expect(typeof proxyCreateCall[0]).toBe("function"); // super result
        expect(typeof proxyCreateCall[1]).toBe("function"); // exception filter
      });

      it("should handle empty arguments", async () => {
        const returnedFunction = contextCreator.create(testInstance, testCallback, "testMethod");
        
        await returnedFunction();

        expect(venokProxyCreateSpy).toHaveBeenCalled();
      });

      it("should handle multiple arguments correctly", async () => {
        const returnedFunction = contextCreator.create(testInstance, testCallback, "testMethod");
        
        await returnedFunction("arg1", { data: "test" }, 42, true);

        expect(venokProxyCreateSpy).toHaveBeenCalled();
      });
    });

    it('should default contextType to "websocket" when not provided', () => {
      // Clear spy before this specific test
      superCreateSpy.mockClear();
      
      contextCreator.create(testInstance, testCallback, "testMethod");

      // Check that the last parameter (contextType) is "websocket"
      const lastCall = superCreateSpy.mock.lastCall;
      expect(lastCall[8]).toBe("websocket");
    });

    it("should use provided contextType", () => {
      // Clear spy before this specific test
      superCreateSpy.mockClear();
      
      const customContextType = "custom-websocket";
      
      contextCreator.create(
        testInstance,
        testCallback,
        "testMethod",
        undefined,
        undefined,
        STATIC_CONTEXT,
        undefined,
        undefined,
        customContextType as any
      );

      // Check that the last parameter (contextType) is the custom type
      const lastCall = superCreateSpy.mock.lastCall;
      expect(lastCall[8]).toBe(customContextType);
    });
  });

  describe("reflectCallbackPattern", () => {
    it("should use Reflect.getMetadata to get MESSAGE_METADATA from callback", () => {
      const mockCallback = () => {};
      const expectedPattern = "test-message-pattern";

      const reflectSpy = spyOn(Reflect, "getMetadata").mockReturnValue(expectedPattern);

      const result = contextCreator.reflectCallbackPattern(mockCallback);

      expect(reflectSpy).toHaveBeenCalledWith(MESSAGE_METADATA, mockCallback);
      expect(result).toBe(expectedPattern);
    });

    it("should return undefined when no metadata exists", () => {
      const mockCallback = () => {};

      const reflectSpy = spyOn(Reflect, "getMetadata").mockReturnValue(undefined);

      const result = contextCreator.reflectCallbackPattern(mockCallback);

      expect(reflectSpy).toHaveBeenCalledWith(MESSAGE_METADATA, mockCallback);
      expect(result).toBeUndefined();
    });

    it("should handle different callback types", () => {
      const arrowFunction = () => {};
      const regularFunction = function () {};
      const asyncFunction = async () => {};
      
      // Create a fresh spy for this test only
      const reflectSpy = spyOn(Reflect, "getMetadata").mockImplementation((key, target) => {
        if (target === arrowFunction) return "arrow-pattern";
        if (target === regularFunction) return "regular-pattern";
        if (target === asyncFunction) return "async-pattern";
        return undefined;
      });

      expect(contextCreator.reflectCallbackPattern(arrowFunction)).toBe("arrow-pattern");
      expect(contextCreator.reflectCallbackPattern(regularFunction)).toBe("regular-pattern");
      expect(contextCreator.reflectCallbackPattern(asyncFunction)).toBe("async-pattern");

      // Only count calls for this specific test
      expect(reflectSpy.mock.calls.length >= 3).toBe(true);
    });

    it("should work with bound functions", () => {
      // @ts-expect-error Mismatch types
      const originalFunction = function () { return this; };
      const boundFunction = originalFunction.bind({ context: "test" });
      const expectedPattern = "bound-pattern";

      const reflectSpy = spyOn(Reflect, "getMetadata").mockReturnValue(expectedPattern);

      const result = contextCreator.reflectCallbackPattern(boundFunction);

      expect(reflectSpy).toHaveBeenCalledWith(MESSAGE_METADATA, boundFunction);
      expect(result).toBe(expectedPattern);
    });
  });

  describe("inheritance and integration", () => {
    it("should inherit getContextModuleKey functionality", () => {
      const mockConstructor = class TestClass {};
      
      // Setup all necessary spies for this test
      const getContextModuleKeySpy = spyOn(contextCreator, "getContextModuleKey").mockReturnValue("module-key");
      spyOn(contextCreator, "reflectCallbackPattern").mockReturnValue("test-pattern");
      spyOn(Object.getPrototypeOf(WebsocketContextCreator.prototype), "create").mockReturnValue(mock(() => {}));
      // @ts-expect-error Mismatch types
      spyOn(contextCreator.filtersContextCreator, "create").mockReturnValue(mock(() => {}));
      // @ts-expect-error Mismatch types
      spyOn(contextCreator.venokProxy, "createProxy").mockReturnValue(mock(() => {}));
      
      contextCreator.create({ constructor: mockConstructor }, () => {}, "testMethod");

      expect(getContextModuleKeySpy).toHaveBeenCalledWith(mockConstructor);
    });

    it("should maintain access to inherited properties", () => {
      expect(contextCreator.contextUtils).toBeDefined();
      expect(contextCreator.venokProxy).toBeDefined();
      expect(contextCreator.reflector).toBeDefined();
      // @ts-expect-error Mismatch types
      expect(contextCreator.filtersContextCreator).toBeDefined();
    });

    it("should properly extend VenokContextCreator", () => {
      expect(Object.getPrototypeOf(contextCreator)).toBeDefined();
      expect(contextCreator).toBeInstanceOf(WebsocketContextCreator);
    });
  });

  describe("error handling", () => {
    it("should propagate errors from super.create", () => {
      const error = new Error("Super create failed");
      spyOn(Object.getPrototypeOf(WebsocketContextCreator.prototype), "create").mockImplementation(() => {
        throw error;
      });
      spyOn(contextCreator, "getContextModuleKey").mockReturnValue("test-module");
      spyOn(contextCreator, "reflectCallbackPattern").mockReturnValue("test-pattern");

      expect(() => {
        contextCreator.create(testInstance, testCallback, "testMethod");
      }).toThrow("Super create failed");
    });

    it("should propagate errors from filtersContextCreator.create", () => {
      const error = new Error("Filter create failed");
      spyOn(Object.getPrototypeOf(WebsocketContextCreator.prototype), "create").mockReturnValue(mock(() => {}));
      spyOn(contextCreator, "getContextModuleKey").mockReturnValue("test-module");
      spyOn(contextCreator, "reflectCallbackPattern").mockReturnValue("test-pattern");
      // @ts-expect-error Mismatch types
      spyOn(contextCreator.filtersContextCreator, "create").mockImplementation(() => {
        throw error;
      });

      expect(() => {
        contextCreator.create(testInstance, testCallback, "testMethod");
      }).toThrow("Filter create failed");
    });
  });
});