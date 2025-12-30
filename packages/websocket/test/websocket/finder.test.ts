/* eslint-disable @typescript-eslint/no-unused-vars */
import type { MetadataScanner, ParamsMetadata } from "@venok/core";

import type { GatewayHandlerMetadata } from "~/websocket/finder.js";

import { afterEach, beforeEach, describe, expect, it, jest, mock, spyOn } from "bun:test";

import { GatewayFinder } from "~/websocket/finder.js";
import { MESSAGE_METADATA, PARAM_ARGS_METADATA } from "~/constants.js";
import { WsParamtype } from "~/enums/ws-paramtype.js";

describe("GatewayFinder", () => {
  let finder: GatewayFinder;
  let mockMetadataScanner: MetadataScanner;

  beforeEach(() => {
    mockMetadataScanner = {
      getAllMethodNames: mock(),
    } as any;
    finder = new GatewayFinder(mockMetadataScanner);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with metadata scanner", () => {
      expect(finder).toBeInstanceOf(GatewayFinder);
      expect((finder as any).metadataScanner).toBe(mockMetadataScanner);
    });
  });

  describe("getGatewayHandlers", () => {
    let testInstance: any;
    let testPrototype: any;

    beforeEach(() => {
      testInstance = {
        handleMessage: () => {},
        handleNotification: () => {},
        regularMethod: () => {},
        handleWithAck: () => {},
        handleWithoutAck: () => {},
      };
      testPrototype = Object.getPrototypeOf(testInstance);
    });

    it("should use provided prototype when given", () => {
      const customPrototype = {
        customMethod: () => {},
      };
      const methodNames = ["customMethod"];
      (mockMetadataScanner.getAllMethodNames as any).mockReturnValue(methodNames);

      const getMetadataSpy = spyOn(Reflect, "getMetadata");
      getMetadataSpy.mockImplementation((key, target) => {
        if (key === MESSAGE_METADATA && target === customPrototype.customMethod) {
          return "custom";
        }
        return undefined;
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const handlers = finder.getGatewayHandlers(testInstance, customPrototype);

      expect(mockMetadataScanner.getAllMethodNames).toHaveBeenCalledWith(customPrototype);
      expect(handlers).toEqual([{ pattern: "custom", methodName: "customMethod", isAckHandledManually: false }]);

      getMetadataSpy.mockRestore();
    });

    it("should use Object.getPrototypeOf when prototype is undefined", () => {
      const methodNames = ["handleMessage"];
      (mockMetadataScanner.getAllMethodNames as any).mockReturnValue(methodNames);

      const getPrototypeSpy = spyOn(Object, "getPrototypeOf");
      getPrototypeSpy.mockReturnValue(testPrototype);

      const getMetadataSpy = spyOn(Reflect, "getMetadata");
      getMetadataSpy.mockImplementation((key, target) => {
        if (key === MESSAGE_METADATA && target === testPrototype.handleMessage) {
          return "message";
        }
        return undefined;
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      finder.getGatewayHandlers(testInstance, undefined);

      expect(getPrototypeSpy).toHaveBeenCalledWith(testInstance);

      getPrototypeSpy.mockRestore();
      getMetadataSpy.mockRestore();
    });

    it("should return empty array when no methods have message metadata", () => {
      const methodNames = ["method1", "method2", "method3"];
      (mockMetadataScanner.getAllMethodNames as any).mockReturnValue(methodNames);

      const getMetadataSpy = spyOn(Reflect, "getMetadata");
      getMetadataSpy.mockReturnValue(undefined); // No message metadata

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const handlers = finder.getGatewayHandlers(testInstance);

      expect(handlers).toEqual([]);

      getMetadataSpy.mockRestore();
    });

    it("should handle empty method list", () => {
      (mockMetadataScanner.getAllMethodNames as any).mockReturnValue([]);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const handlers = finder.getGatewayHandlers(testInstance);

      expect(handlers).toEqual([]);
    });
  });

  describe("exploreMethod", () => {
    let testInstance: any;
    let testPrototype: any;

    beforeEach(() => {
      testInstance = {
        testMethod: () => {},
        anotherMethod: () => {},
      };
      testPrototype = Object.getPrototypeOf(testInstance);
    });

    it("should return handler metadata for method with message metadata", () => {
      const getMetadataSpy = spyOn(Reflect, "getMetadata");
      getMetadataSpy.mockImplementation((key, target) => {
        if (key === MESSAGE_METADATA && target === testPrototype.testMethod) {
          return "test-pattern";
        }
        return undefined;
      });

      const result = (finder as any).exploreMethod(testInstance, testPrototype, "testMethod");

      expect(result).toEqual({
        pattern: "test-pattern",
        methodName: "testMethod",
        isAckHandledManually: false,
      });

      getMetadataSpy.mockRestore();
    });

    it("should return null for method without message metadata", () => {
      const getMetadataSpy = spyOn(Reflect, "getMetadata");
      getMetadataSpy.mockReturnValue(undefined);

      const result = (finder as any).exploreMethod(testInstance, testPrototype, "testMethod");

      expect(result).toBeNull();

      getMetadataSpy.mockRestore();
    });

    it("should detect ACK decorator correctly", () => {
      const getMetadataSpy = spyOn(Reflect, "getMetadata");
      getMetadataSpy.mockImplementation((key, target, propertyKey?) => {
        if (key === MESSAGE_METADATA && target === testPrototype.testMethod) {
          return "test-pattern";
        }
        if (key === PARAM_ARGS_METADATA && propertyKey === "testMethod") {
          return {
            "2:0": { index: 0, type: WsParamtype.ACK },
          } as ParamsMetadata;
        }
        return undefined;
      });

      const result = (finder as any).exploreMethod(testInstance, testPrototype, "testMethod");

      expect(result).toEqual({
        pattern: "test-pattern",
        methodName: "testMethod",
        isAckHandledManually: true,
      });

      getMetadataSpy.mockRestore();
    });
  });

  describe("hasAckDecorator", () => {
    let testPrototype: any;
    let testConstructor: any;

    beforeEach(() => {
      testConstructor = class TestClass {
        testMethod() {}
        anotherMethod() {}
      };
      testPrototype = testConstructor.prototype;
    });

    it("should return true when method has ACK parameter", () => {
      const getMetadataSpy = spyOn(Reflect, "getMetadata");
      getMetadataSpy.mockImplementation((key, target, propertyKey?) => {
        if (key === PARAM_ARGS_METADATA && target === testConstructor && propertyKey === "testMethod") {
          return {
            "2:0": { index: 0, type: WsParamtype.ACK },
            "1:1": { index: 1, type: WsParamtype.PAYLOAD },
          } as ParamsMetadata;
        }
        return undefined;
      });

      const result = (finder as any).hasAckDecorator(testPrototype, "testMethod");

      expect(result).toBe(true);

      getMetadataSpy.mockRestore();
    });

    it("should return false when method has no ACK parameter", () => {
      const getMetadataSpy = spyOn(Reflect, "getMetadata");
      getMetadataSpy.mockImplementation((key, target, propertyKey?) => {
        if (key === PARAM_ARGS_METADATA && target === testConstructor && propertyKey === "testMethod") {
          return {
            "0:0": { index: 0, type: WsParamtype.SOCKET },
            "1:1": { index: 1, type: WsParamtype.PAYLOAD },
          } as ParamsMetadata;
        }
        return undefined;
      });

      const result = (finder as any).hasAckDecorator(testPrototype, "testMethod");

      expect(result).toBe(false);

      getMetadataSpy.mockRestore();
    });

    it("should return false when no params metadata exists", () => {
      const getMetadataSpy = spyOn(Reflect, "getMetadata");
      getMetadataSpy.mockReturnValue(undefined);

      const result = (finder as any).hasAckDecorator(testPrototype, "testMethod");

      expect(result).toBe(false);

      getMetadataSpy.mockRestore();
    });

    it("should handle empty params metadata", () => {
      const getMetadataSpy = spyOn(Reflect, "getMetadata");
      getMetadataSpy.mockImplementation((key, target, propertyKey?) => {
        if (key === PARAM_ARGS_METADATA && target === testConstructor && propertyKey === "testMethod") {
          return {} as ParamsMetadata;
        }
        return undefined;
      });

      const result = (finder as any).hasAckDecorator(testPrototype, "testMethod");

      expect(result).toBe(false);

      getMetadataSpy.mockRestore();
    });

    it("should handle multiple parameter types correctly", () => {
      const getMetadataSpy = spyOn(Reflect, "getMetadata");
      getMetadataSpy.mockImplementation((key, target, propertyKey?) => {
        if (key === PARAM_ARGS_METADATA && target === testConstructor && propertyKey === "testMethod") {
          return {
            "0:0": { index: 0, type: WsParamtype.SOCKET },
            "1:1": { index: 1, type: WsParamtype.PAYLOAD },
            "3:2": { index: 2, type: WsParamtype.PATTERN },
            "2:3": { index: 3, type: WsParamtype.ACK },
          } as ParamsMetadata;
        }
        return undefined;
      });

      const result = (finder as any).hasAckDecorator(testPrototype, "testMethod");

      expect(result).toBe(true);

      getMetadataSpy.mockRestore();
    });

    it("should parse parameter type from key correctly", () => {
      const getMetadataSpy = spyOn(Reflect, "getMetadata");
      getMetadataSpy.mockImplementation((key, target, propertyKey?) => {
        if (key === PARAM_ARGS_METADATA && target === testConstructor && propertyKey === "testMethod") {
          return {
            "1:0:someExtraInfo": { index: 0, type: WsParamtype.PAYLOAD },
            "2:1:moreInfo": { index: 1, type: WsParamtype.ACK },
          } as ParamsMetadata;
        }
        return undefined;
      });

      const result = (finder as any).hasAckDecorator(testPrototype, "testMethod");

      expect(result).toBe(true);

      getMetadataSpy.mockRestore();
    });
  });

  describe("integration scenarios", () => {
    it("should work with realistic WebSocket gateway class", () => {
      class TestGateway {
        handleMessage(data: any) {}
        handleNotification(data: any, ack: Function) {}
        handleConnection(socket: any) {}
        regularMethod() {}
      }

      const instance = new TestGateway();
      const prototype = TestGateway.prototype;

      const methodNames = ["handleMessage", "handleNotification", "handleConnection", "regularMethod"];
      (mockMetadataScanner.getAllMethodNames as any).mockReturnValue(methodNames);

      const getMetadataSpy = spyOn(Reflect, "getMetadata");
      getMetadataSpy.mockImplementation((key, target, propertyKey?) => {
        if (key === MESSAGE_METADATA) {
          if (target === prototype.handleMessage) return "message";
          if (target === prototype.handleNotification) return "notification";
          if (target === prototype.handleConnection) return "connection";
          return undefined; // regularMethod has no metadata
        }
        if (key === PARAM_ARGS_METADATA) {
          if (propertyKey === "handleNotification") {
            return {
              "1:0": { index: 0, type: WsParamtype.PAYLOAD },
              "2:1": { index: 1, type: WsParamtype.ACK },
            } as ParamsMetadata;
          }
          if (propertyKey === "handleMessage") {
            return {
              "1:0": { index: 0, type: WsParamtype.PAYLOAD },
            } as ParamsMetadata;
          }
          if (propertyKey === "handleConnection") {
            return {
              "0:0": { index: 0, type: WsParamtype.SOCKET },
            } as ParamsMetadata;
          }
        }
        return undefined;
      });

      const handlers = finder.getGatewayHandlers(instance);

      expect(handlers).toEqual([
        { pattern: "message", methodName: "handleMessage", isAckHandledManually: false },
        { pattern: "notification", methodName: "handleNotification", isAckHandledManually: true },
        { pattern: "connection", methodName: "handleConnection", isAckHandledManually: false },
      ]);

      getMetadataSpy.mockRestore();
    });

    it("should handle complex parameter configurations", () => {
      class ComplexGateway {
        handleWithAllParams(socket: any, data: any, ack: Function, pattern: string) {}
        handleMinimal(data: any) {}
      }

      const instance = new ComplexGateway();
      const prototype = ComplexGateway.prototype;

      const methodNames = ["handleWithAllParams", "handleMinimal"];
      (mockMetadataScanner.getAllMethodNames as any).mockReturnValue(methodNames);

      const getMetadataSpy = spyOn(Reflect, "getMetadata");
      getMetadataSpy.mockImplementation((key, target, propertyKey?) => {
        if (key === MESSAGE_METADATA) {
          if (target === prototype.handleWithAllParams) return "complex";
          if (target === prototype.handleMinimal) return "simple";
        }
        if (key === PARAM_ARGS_METADATA) {
          if (propertyKey === "handleWithAllParams") {
            return {
              "0:0": { index: 0, type: WsParamtype.SOCKET },
              "1:1": { index: 1, type: WsParamtype.PAYLOAD },
              "2:2": { index: 2, type: WsParamtype.ACK },
              "3:3": { index: 3, type: WsParamtype.PATTERN },
            } as ParamsMetadata;
          }
          if (propertyKey === "handleMinimal") {
            return {
              "1:0": { index: 0, type: WsParamtype.PAYLOAD },
            } as ParamsMetadata;
          }
        }
        return undefined;
      });

      const handlers = finder.getGatewayHandlers(instance);

      expect(handlers).toEqual([
        { pattern: "complex", methodName: "handleWithAllParams", isAckHandledManually: true },
        { pattern: "simple", methodName: "handleMinimal", isAckHandledManually: false },
      ]);

      getMetadataSpy.mockRestore();
    });

    it("should handle inheritance correctly", () => {
      class BaseGateway {
        baseMethod() {}
      }

      class DerivedGateway extends BaseGateway {
        derivedMethod() {}
      }

      const instance = new DerivedGateway();
      const prototype = DerivedGateway.prototype;

      const methodNames = ["baseMethod", "derivedMethod"];
      (mockMetadataScanner.getAllMethodNames as any).mockReturnValue(methodNames);

      const getMetadataSpy = spyOn(Reflect, "getMetadata");
      getMetadataSpy.mockImplementation((key, target) => {
        if (key === MESSAGE_METADATA) {
          if (target === prototype.derivedMethod) return "derived";
          // baseMethod from parent class
          if (target === prototype.baseMethod) return "base";
        }
        return undefined;
      });

      const handlers = finder.getGatewayHandlers(instance);

      expect(handlers).toEqual([
        { pattern: "base", methodName: "baseMethod", isAckHandledManually: false },
        { pattern: "derived", methodName: "derivedMethod", isAckHandledManually: false },
      ]);

      getMetadataSpy.mockRestore();
    });
  });

  describe("edge cases", () => {
    it("should handle methods with undefined message metadata gracefully", () => {
      const testInstance = {
        method1: () => {},
        method2: () => {},
      };

      const methodNames = ["method1", "method2"];
      (mockMetadataScanner.getAllMethodNames as any).mockReturnValue(methodNames);

      const getMetadataSpy = spyOn(Reflect, "getMetadata");
      getMetadataSpy.mockImplementation((key, target) => {
        if (key === MESSAGE_METADATA) {
          return undefined; // All methods return undefined
        }
        return undefined;
      });

      const handlers = finder.getGatewayHandlers(testInstance);

      expect(handlers).toEqual([]);

      getMetadataSpy.mockRestore();
    });

    it("should handle malformed parameter metadata keys", () => {
      class TestGateway {
        testMethod() {}
      }

      const instance = new TestGateway();
      const prototype = TestGateway.prototype;

      const getMetadataSpy = spyOn(Reflect, "getMetadata");
      getMetadataSpy.mockImplementation((key, target, propertyKey?) => {
        if (key === MESSAGE_METADATA && target === prototype.testMethod) {
          return "test";
        }
        if (key === PARAM_ARGS_METADATA && propertyKey === "testMethod") {
          return {
            malformed: { index: 0 },
            "invalid:key": { index: 1 },
            "NaN:0": { index: 2 },
          } as any;
        }
        return undefined;
      });

      const result = (finder as any).hasAckDecorator(TestGateway.prototype, "testMethod");

      // Should handle malformed keys gracefully and return false
      expect(result).toBe(false);

      getMetadataSpy.mockRestore();
    });

    it("should handle null/undefined instances by throwing", () => {
      const methodNames: string[] = [];
      (mockMetadataScanner.getAllMethodNames as any).mockReturnValue(methodNames);

      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        finder.getGatewayHandlers(null as any);
      }).toThrow();

      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        finder.getGatewayHandlers(undefined as any);
      }).toThrow();
    });

    it("should handle methods that are not functions", () => {
      const testInstance = {
        property: "not a function",
        method: () => {},
      };

      const methodNames = ["property", "method"];
      (mockMetadataScanner.getAllMethodNames as any).mockReturnValue(methodNames);

      const getMetadataSpy = spyOn(Reflect, "getMetadata");
      getMetadataSpy.mockImplementation((key, target) => {
        if (key === MESSAGE_METADATA) {
          // Both should have metadata, but only method should be processed
          return "pattern";
        }
        return undefined;
      });

      const handlers = finder.getGatewayHandlers(testInstance);

      // Should handle both, even if one is not a function
      expect(handlers).toHaveLength(2);

      getMetadataSpy.mockRestore();
    });
  });

  describe("type safety and interface compliance", () => {
    it("should return handlers with correct GatewayHandlerMetadata structure", () => {
      const testInstance = {
        testMethod: () => {},
      };

      const methodNames = ["testMethod"];
      (mockMetadataScanner.getAllMethodNames as any).mockReturnValue(methodNames);

      const getMetadataSpy = spyOn(Reflect, "getMetadata");
      getMetadataSpy.mockImplementation((key, target) => {
        if (key === MESSAGE_METADATA) {
          return "test-pattern";
        }
        return undefined;
      });

      const handlers = finder.getGatewayHandlers(testInstance);

      expect(handlers).toHaveLength(1);
      
      const handler = handlers[0];
      expect(handler).toHaveProperty("pattern");
      expect(handler).toHaveProperty("methodName");
      expect(handler).toHaveProperty("isAckHandledManually");
      
      expect(typeof handler.pattern).toBe("string");
      expect(typeof handler.methodName).toBe("string");
      expect(typeof handler.isAckHandledManually).toBe("boolean");

      // Type check for GatewayHandlerMetadata
      const typedHandler: GatewayHandlerMetadata = handler;
      expect(typedHandler).toBeDefined();

      getMetadataSpy.mockRestore();
    });
  });
});