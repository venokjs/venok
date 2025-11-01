import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";

import { ContextUtils } from "~/helpers/context.helper.js";
import { ROUTE_ARGS_METADATA, PARAMTYPES_METADATA } from "~/constants.js";
import { ExecutionContextHost } from "~/context/execution-host.js";

describe("ContextUtils", () => {
  let contextUtils: ContextUtils;
  let spies: any[] = [];

  beforeEach(() => {
    contextUtils = new ContextUtils();
  });

  afterEach(() => {
    // Restore all spies after each test
    spies.forEach(spy => {
      if (spy && typeof spy.mockRestore === "function") {
        spy.mockRestore();
      }
    });
    spies = [];
  });

  describe("mapParamType", () => {
    it("should return first part of key split by colon", () => {
      expect(contextUtils.mapParamType("test:123")).toBe("test");
      expect(contextUtils.mapParamType("custom:param:value")).toBe("custom");
      expect(contextUtils.mapParamType("simple")).toBe("simple");
    });
  });

  describe("reflectCallbackParamtypes", () => {
    it("should return paramtypes metadata", () => {
      class TestClass {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        testMethod(param1: string, param2: number) {}
      }
      
      const instance = new TestClass();
      const spy = spyOn(Reflect, "getMetadata").mockReturnValue([String, Number]);
      spies.push(spy);
      
      const result = contextUtils.reflectCallbackParamtypes(instance, "testMethod");
      
      expect(spy).toHaveBeenCalledWith(PARAMTYPES_METADATA, instance, "testMethod");
      expect(result).toEqual([String, Number]);
    });
  });

  describe("getArgumentsLength", () => {
    it("should return max index + 1 when keys exist", () => {
      const metadata = {
        key1: { index: 0 },
        key2: { index: 2 },
        key3: { index: 1 },
      };
      const keys = ["key1", "key2", "key3"];
      
      expect(contextUtils.getArgumentsLength(keys, metadata)).toBe(3);
    });

    it("should return 0 when keys array is empty", () => {
      const metadata = {};
      const keys: string[] = [];
      
      expect(contextUtils.getArgumentsLength(keys, metadata)).toBe(0);
    });
  });
  describe("reflectCallbackMetadata", () => {
    it("should return callback metadata from constructor", () => {
      class TestController {
        callback() {}
      }
      
      const instance = new TestController();
      const mockMetadata = { 
        "custom:0": { 
          index: 0, 
          data: "test", 
          factory: () => {}, 
        }, 
      };
      
      const spy = spyOn(Reflect, "getMetadata").mockReturnValue(mockMetadata);
      spies.push(spy);
      
      const result = contextUtils.reflectCallbackMetadata(
        instance,
        "callback",
        ROUTE_ARGS_METADATA
      );
      
      expect(spy).toHaveBeenCalledWith(ROUTE_ARGS_METADATA, instance.constructor, "callback");
      expect(result).toEqual(mockMetadata);
    });
  });

  describe("createNullArray", () => {
    it("should create N size array filled with null", () => {
      const size = 3;
      expect(contextUtils.createNullArray(size)).toEqual([
        undefined,
        undefined,
        undefined,
      ]);
    });
  });
  describe("mergeParamsMetatypes", () => {
    it('should return "paramsProperties" when paramtypes array doesn\'t exists', () => {
      const paramsProperties = ["1"];
      expect(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        contextUtils.mergeParamsMetatypes(paramsProperties as any, null!)
        // @ts-expect-error Mismatch types
      ).toEqual(paramsProperties);
    });

    it("should merge paramsProperties with paramtypes", () => {
      const paramsProperties = [
        { index: 0, data: "test1" },
        { index: 1, data: "test2" },
      ];
      const paramtypes = [String, Number];

      // @ts-expect-error Mismatch types
      const result = contextUtils.mergeParamsMetatypes(paramsProperties, paramtypes);

      // @ts-expect-error Mismatch types
      expect(result).toEqual([
        { index: 0, data: "test1", metatype: String },
        { index: 1, data: "test2", metatype: Number },
      ]);
    });
  });
  describe("getCustomFactory", () => {
    const contextFactory = (args: unknown[]) => new ExecutionContextHost(args);

    describe("when factory is function", () => {
      it("should return curried factory", () => {
        const data = 3;
        const result = 10;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const customFactory = (_: any, req: any) => result;

        expect(contextUtils.getCustomFactory(customFactory, data, contextFactory)()).toBe(result);
      });
    });
    describe("when factory is undefined / is not a function", () => {
      it("should return curried null identity", () => {
        const customFactory = undefined;
        expect(
          contextUtils.getCustomFactory(
            customFactory!,
            undefined,
            contextFactory
          )()
        ).toBe(null);
      });
    });
  });

  describe("getContextFactory", () => {
    it("should create context factory that returns ExecutionContextHost", () => {
      const contextType = "http";
      const args = ["request", "response"];
      
      const factory = contextUtils.getContextFactory(contextType);
      const context = factory(args);
      
      expect(context).toBeInstanceOf(ExecutionContextHost);
      expect(context.getType()).toBe(contextType);
    });

    it("should create context factory with instance and callback", () => {
      class TestInstance {}
      const instance = new TestInstance();
      const callback = () => {};
      const contextType = "rpc";
      const args = ["data"];
      
      const factory = contextUtils.getContextFactory(contextType, instance, callback);
      const context = factory(args);
      
      expect(context).toBeInstanceOf(ExecutionContextHost);
      expect(context.getType()).toBe(contextType);
      expect(context.getClass()).toBe(TestInstance);
      expect(context.getHandler()).toBe(callback);
    });
  });
});