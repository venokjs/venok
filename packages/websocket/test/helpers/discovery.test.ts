/* eslint-disable @typescript-eslint/no-unused-vars */
import type { WebsocketGatewayDiscoveryMeta } from "~/helpers/discovery.helper.js";

import { afterEach, beforeEach, describe, expect, it, jest, mock, spyOn } from "bun:test";

import { VenokBaseDiscovery, WebsocketGatewayDiscovery } from "~/helpers/discovery.helper.js";
import { GATEWAY_OPTIONS, PORT_METADATA } from "~/constants.js";

describe("VenokBaseDiscovery", () => {
  let baseDiscovery: VenokBaseDiscovery<any>;
  const testMeta = { test: "metadata", value: 123 };

  beforeEach(() => {
    baseDiscovery = new (class TestDiscovery extends VenokBaseDiscovery<any> {})(testMeta);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with provided metadata", () => {
      const customMeta = { custom: "data", nested: { prop: "value" } };
      const discovery = new (class extends VenokBaseDiscovery<any> {})(customMeta);
      
      expect(discovery.getMeta()).toEqual(customMeta);
      expect(discovery.getMeta()).toBe(customMeta); // Should be the same reference
    });

    it("should handle null metadata", () => {
      const discovery = new (class extends VenokBaseDiscovery<any> {})(null);
      expect(discovery.getMeta()).toBeNull();
    });

    it("should handle undefined metadata", () => {
      const discovery = new (class extends VenokBaseDiscovery<any> {})(undefined);
      expect(discovery.getMeta()).toBeUndefined();
    });

    it("should handle primitive metadata", () => {
      const stringDiscovery = new (class extends VenokBaseDiscovery<string> {})("test-string");
      const numberDiscovery = new (class extends VenokBaseDiscovery<number> {})(42);
      const booleanDiscovery = new (class extends VenokBaseDiscovery<boolean> {})(true);

      expect(stringDiscovery.getMeta()).toBe("test-string");
      expect(numberDiscovery.getMeta()).toBe(42);
      expect(booleanDiscovery.getMeta()).toBe(true);
    });
  });

  describe("getMeta", () => {
    it("should return the metadata passed in constructor", () => {
      expect(baseDiscovery.getMeta()).toEqual(testMeta);
      expect(baseDiscovery.getMeta()).toBe(testMeta);
    });

    it("should return consistent metadata across multiple calls", () => {
      const meta1 = baseDiscovery.getMeta();
      const meta2 = baseDiscovery.getMeta();
      const meta3 = baseDiscovery.getMeta();

      expect(meta1).toBe(meta2);
      expect(meta2).toBe(meta3);
      expect(meta1).toEqual(testMeta);
    });

    it("should maintain metadata immutability", () => {
      const originalMeta = { mutable: "value", nested: { prop: "test" } };
      const discovery = new (class extends VenokBaseDiscovery<any> {})(originalMeta);

      // Modify the original object
      originalMeta.mutable = "changed";
      originalMeta.nested.prop = "modified";

      // The discovery should still reference the same object (shallow reference)
      expect(discovery.getMeta()).toBe(originalMeta);
      expect(discovery.getMeta().mutable).toBe("changed");
    });
  });

  describe("setDiscovery", () => {
    it("should set discovery when not previously set", () => {
      const testClass = class TestClass {};
      const testHandler = jest.fn();
      const discoveredItem = { class: testClass, handler: testHandler };

      baseDiscovery.setDiscovery(discoveredItem);

      expect(baseDiscovery.getClass()).toBe(testClass);
      expect(baseDiscovery.getHandler()).toBe(testHandler);
    });

    it("should not override already set discovery", () => {
      const firstClass = class FirstClass {};
      const firstHandler = jest.fn();
      const firstItem = { class: firstClass, handler: firstHandler };

      const secondClass = class SecondClass {};
      const secondHandler = jest.fn();
      const secondItem = { class: secondClass, handler: secondHandler };

      baseDiscovery.setDiscovery(firstItem);
      baseDiscovery.setDiscovery(secondItem); // This should not override

      expect(baseDiscovery.getClass()).toBe(firstClass);
      expect(baseDiscovery.getHandler()).toBe(firstHandler);
      expect(baseDiscovery.getClass()).not.toBe(secondClass);
    });

    it("should handle discovery item without handler", () => {
      const testClass = class TestClass {};
      const discoveredItem = { class: testClass };

      baseDiscovery.setDiscovery(discoveredItem);

      expect(baseDiscovery.getClass()).toBe(testClass);
      expect(baseDiscovery.getHandler()).toBeUndefined();
    });

    it("should handle discovery item with null handler", () => {
      const testClass = class TestClass {};
      const discoveredItem = { class: testClass, handler: null };

      // @ts-expect-error Mismatch types
      baseDiscovery.setDiscovery(discoveredItem);

      expect(baseDiscovery.getClass()).toBe(testClass);
      expect(baseDiscovery.getHandler()).toBeNull();
    });

    it("should handle discovery item with function handler", () => {
      const testClass = class TestClass {};
      const testHandler = (arg1: any, arg2: any) => `${arg1}-${arg2}`;
      const discoveredItem = { class: testClass, handler: testHandler };

      baseDiscovery.setDiscovery(discoveredItem);

      expect(baseDiscovery.getClass()).toBe(testClass);
      expect(baseDiscovery.getHandler()).toBe(testHandler);
      expect(baseDiscovery.getHandler()!("test", "handler")).toBe("test-handler");
    });

    it("should use nullish coalescing assignment correctly", () => {
      const testClass = class TestClass {};
      const testHandler = jest.fn();
      const discoveredItem = { class: testClass, handler: testHandler };

      // First assignment should work
      baseDiscovery.setDiscovery(discoveredItem);
      expect(baseDiscovery.getClass()).toBe(testClass);

      // Second assignment should be ignored due to nullish coalescing
      const newClass = class NewClass {};
      baseDiscovery.setDiscovery({ class: newClass });
      expect(baseDiscovery.getClass()).toBe(testClass); // Still the original class
    });
  });

  describe("getClass", () => {
    it("should return the class from discovery item", () => {
      const testClass = class TestClass {
        static staticMethod() {
          return "static";
        }
        
        instanceMethod() {
          return "instance";
        }
      };
      const discoveredItem = { class: testClass };

      baseDiscovery.setDiscovery(discoveredItem);
      
      const retrievedClass = baseDiscovery.getClass();
      expect(retrievedClass).toBe(testClass);
      expect(retrievedClass.staticMethod()).toBe("static");
      expect(new retrievedClass().instanceMethod()).toBe("instance");
    });

    it("should handle different types of classes", () => {
      // Regular class
      class RegularClass {}
      
      // Class with constructor params
      class ClassWithConstructor {
        constructor(public value: string) {}
      }
      
      // Abstract class
      abstract class AbstractClass {
        abstract method(): void;
      }
      
      // Function constructor
      function FunctionConstructor() {}

      const discoveries = [
        new (class extends VenokBaseDiscovery<any> {})({}),
        new (class extends VenokBaseDiscovery<any> {})({}),
        new (class extends VenokBaseDiscovery<any> {})({}),
        new (class extends VenokBaseDiscovery<any> {})({}),
      ];

      discoveries[0].setDiscovery({ class: RegularClass });
      discoveries[1].setDiscovery({ class: ClassWithConstructor });
      discoveries[2].setDiscovery({ class: AbstractClass });
      discoveries[3].setDiscovery({ class: FunctionConstructor });

      expect(discoveries[0].getClass()).toBe(RegularClass);
      expect(discoveries[1].getClass()).toBe(ClassWithConstructor);
      expect(discoveries[2].getClass()).toBe(AbstractClass);
      expect(discoveries[3].getClass()).toBe(FunctionConstructor);
    });
  });

  describe("getHandler", () => {
    it("should return undefined when discovery has no handler", () => {
      const testClass = class TestClass {};
      baseDiscovery.setDiscovery({ class: testClass });
      
      expect(baseDiscovery.getHandler()).toBeUndefined();
    });

    it("should return the handler from discovery item", () => {
      const testClass = class TestClass {};
      const testHandler = jest.fn().mockReturnValue("handler-result");
      const discoveredItem = { class: testClass, handler: testHandler };

      baseDiscovery.setDiscovery(discoveredItem);
      
      const retrievedHandler = baseDiscovery.getHandler();
      expect(retrievedHandler).toBe(testHandler);
      expect(retrievedHandler!()).toBe("handler-result");
      expect(testHandler).toHaveBeenCalledTimes(1);
    });

    it("should handle different types of handlers", () => {
      const syncHandler = (x: number) => x * 2;
      const asyncHandler = async (x: number) => Promise.resolve(x * 3);
      const arrowHandler = (x: string) => x.toUpperCase();
      
      const discoveries = [
        new (class extends VenokBaseDiscovery<any> {})({}),
        new (class extends VenokBaseDiscovery<any> {})({}),
        new (class extends VenokBaseDiscovery<any> {})({}),
      ];

      discoveries[0].setDiscovery({ class: class {}, handler: syncHandler });
      discoveries[1].setDiscovery({ class: class {}, handler: asyncHandler });
      discoveries[2].setDiscovery({ class: class {}, handler: arrowHandler });

      expect(discoveries[0].getHandler()!(5)).toBe(10);
      expect(discoveries[1].getHandler()!(4)).toBeInstanceOf(Promise);
      expect(discoveries[2].getHandler()!("test")).toBe("TEST");
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle empty object as discovery", () => {
      const emptyDiscovery = {} as any;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      baseDiscovery.setDiscovery(emptyDiscovery);

      expect(baseDiscovery.getClass()).toBeUndefined();
      expect(baseDiscovery.getHandler()).toBeUndefined();
    });

    it("should handle discovery with null class", () => {
      const nullClassDiscovery = { class: null, handler: jest.fn() };
      baseDiscovery.setDiscovery(nullClassDiscovery);

      expect(baseDiscovery.getClass()).toBeNull();
      expect(baseDiscovery.getHandler()).toBeDefined();
    });

    it("should maintain method call consistency", () => {
      const testClass = class TestClass {};
      const testHandler = jest.fn();
      const discoveredItem = { class: testClass, handler: testHandler };

      baseDiscovery.setDiscovery(discoveredItem);

      // Multiple calls should return the same references
      expect(baseDiscovery.getClass()).toBe(baseDiscovery.getClass());
      expect(baseDiscovery.getHandler()).toBe(baseDiscovery.getHandler());
    });

    it("should work with inheritance", () => {
      class ExtendedDiscovery extends VenokBaseDiscovery<any> {
        customMethod() {
          return "extended";
        }
      }

      const extendedDiscovery = new ExtendedDiscovery(testMeta);
      const testClass = class TestClass {};
      const testHandler = jest.fn();

      extendedDiscovery.setDiscovery({ class: testClass, handler: testHandler });

      expect(extendedDiscovery.getMeta()).toBe(testMeta);
      expect(extendedDiscovery.getClass()).toBe(testClass);
      expect(extendedDiscovery.getHandler()).toBe(testHandler);
      expect(extendedDiscovery.customMethod()).toBe("extended");
    });
  });
});

describe("WebsocketGatewayDiscovery", () => {
  let gatewayDiscovery: WebsocketGatewayDiscovery;
  let mockMeta: WebsocketGatewayDiscoveryMeta;

  beforeEach(() => {
    mockMeta = {
      [PORT_METADATA]: 8080,
      [GATEWAY_OPTIONS]: { path: "/socket" },
    };
    gatewayDiscovery = new WebsocketGatewayDiscovery(mockMeta);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with WebsocketGatewayDiscoveryMeta", () => {
      expect(gatewayDiscovery.getMeta()).toBe(mockMeta);
      expect(gatewayDiscovery.getPort()).toBe(8080);
      expect(gatewayDiscovery.getOptions()).toEqual({ path: "/socket" });
    });

    it("should handle meta with minimal options", () => {
      const minimalMeta = {
        [PORT_METADATA]: 3000,
        [GATEWAY_OPTIONS]: {},
      };
      const discovery = new WebsocketGatewayDiscovery(minimalMeta);

      expect(discovery.getPort()).toBe(3000);
      expect(discovery.getOptions()).toEqual({});
    });

    it("should handle meta with complex options", () => {
      const complexMeta = {
        [PORT_METADATA]: 9999,
        [GATEWAY_OPTIONS]: { 
          path: "/api/v1/websocket",
          timeout: 30000,
          maxConnections: 1000,
          cors: true,
        },
      };
      const discovery = new WebsocketGatewayDiscovery(complexMeta);

      expect(discovery.getPort()).toBe(9999);
      expect(discovery.getOptions()).toEqual({
        path: "/api/v1/websocket",
        // @ts-expect-error Mismatch types
        timeout: 30000,
        maxConnections: 1000,
        cors: true,
      });
    });
  });

  describe("getPort", () => {
    it("should return the port from metadata", () => {
      expect(gatewayDiscovery.getPort()).toBe(8080);
    });

    it("should handle different port numbers", () => {
      const ports = [80, 443, 3000, 8000, 8080, 65535];
      
      ports.forEach(port => {
        const meta = {
          [PORT_METADATA]: port,
          [GATEWAY_OPTIONS]: {},
        };
        const discovery = new WebsocketGatewayDiscovery(meta);
        expect(discovery.getPort()).toBe(port);
      });
    });

    it("should handle zero port", () => {
      const meta = {
        [PORT_METADATA]: 0,
        [GATEWAY_OPTIONS]: {},
      };
      const discovery = new WebsocketGatewayDiscovery(meta);
      expect(discovery.getPort()).toBe(0);
    });

    it("should maintain port consistency across calls", () => {
      const port1 = gatewayDiscovery.getPort();
      const port2 = gatewayDiscovery.getPort();
      const port3 = gatewayDiscovery.getPort();

      expect(port1).toBe(port2);
      expect(port2).toBe(port3);
      expect(port1).toBe(8080);
    });
  });

  describe("getOptions", () => {
    it("should return the options from metadata", () => {
      expect(gatewayDiscovery.getOptions()).toEqual({ path: "/socket" });
    });

    it("should return the same reference on multiple calls", () => {
      const options1 = gatewayDiscovery.getOptions();
      const options2 = gatewayDiscovery.getOptions();

      expect(options1).toBe(options2);
      expect(options1).toBe(mockMeta[GATEWAY_OPTIONS]);
    });

    it("should handle empty options", () => {
      const meta = {
        [PORT_METADATA]: 3000,
        [GATEWAY_OPTIONS]: {},
      };
      const discovery = new WebsocketGatewayDiscovery(meta);

      expect(discovery.getOptions()).toEqual({});
    });

    it("should handle options with undefined path", () => {
      const meta = {
        [PORT_METADATA]: 3000,
        [GATEWAY_OPTIONS]: { path: undefined },
      };
      const discovery = new WebsocketGatewayDiscovery(meta);

      expect(discovery.getOptions().path).toBeUndefined();
    });

    it("should handle options with null path", () => {
      const meta = {
        [PORT_METADATA]: 3000,
        [GATEWAY_OPTIONS]: { path: null } as any,
      };
      const discovery = new WebsocketGatewayDiscovery(meta);

      expect(discovery.getOptions().path).toBeNull();
    });

    it("should handle options modifications", () => {
      const options = gatewayDiscovery.getOptions();
      const originalPath = options.path;

      // Modify the returned options
      options.path = "/modified";

      // The next call should reflect the modification (same reference)
      expect(gatewayDiscovery.getOptions().path).toBe("/modified");
      expect(gatewayDiscovery.getOptions()).toBe(options);
    });
  });

  describe("inheritance from VenokBaseDiscovery", () => {
    it("should inherit all base functionality", () => {
      const testClass = class TestGateway {};
      const testHandler = jest.fn();
      const discoveryItem = { class: testClass, handler: testHandler };

      gatewayDiscovery.setDiscovery(discoveryItem);

      expect(gatewayDiscovery.getClass()).toBe(testClass);
      expect(gatewayDiscovery.getHandler()).toBe(testHandler);
      expect(gatewayDiscovery.getMeta()).toBe(mockMeta);
    });

    it("should maintain both base and extended functionality", () => {
      const testClass = class TestGateway {};
      const testHandler = jest.fn();
      const discoveryItem = { class: testClass, handler: testHandler };

      gatewayDiscovery.setDiscovery(discoveryItem);

      // Base functionality
      expect(gatewayDiscovery.getMeta()).toBe(mockMeta);
      expect(gatewayDiscovery.getClass()).toBe(testClass);
      expect(gatewayDiscovery.getHandler()).toBe(testHandler);

      // Extended functionality
      expect(gatewayDiscovery.getPort()).toBe(8080);
      expect(gatewayDiscovery.getOptions()).toEqual({ path: "/socket" });
    });

    it("should not override discovery once set", () => {
      const firstClass = class FirstGateway {};
      const firstHandler = jest.fn();
      const firstItem = { class: firstClass, handler: firstHandler };

      const secondClass = class SecondGateway {};
      const secondHandler = jest.fn();
      const secondItem = { class: secondClass, handler: secondHandler };

      gatewayDiscovery.setDiscovery(firstItem);
      gatewayDiscovery.setDiscovery(secondItem); // Should be ignored

      expect(gatewayDiscovery.getClass()).toBe(firstClass);
      expect(gatewayDiscovery.getHandler()).toBe(firstHandler);

      // Port and options should still work
      expect(gatewayDiscovery.getPort()).toBe(8080);
      expect(gatewayDiscovery.getOptions()).toEqual({ path: "/socket" });
    });
  });

  describe("type safety and metadata structure", () => {
    it("should enforce correct metadata structure", () => {
      const validMeta: WebsocketGatewayDiscoveryMeta = {
        [PORT_METADATA]: 4000,
        [GATEWAY_OPTIONS]: { path: "/ws" },
      };

      const discovery = new WebsocketGatewayDiscovery(validMeta);
      
      expect(typeof discovery.getPort()).toBe("number");
      expect(typeof discovery.getOptions()).toBe("object");
      expect(discovery.getOptions()).toHaveProperty("path");
    });

    it("should work with extended gateway options", () => {
      interface ExtendedGatewayOptions {
        path?: string;
        timeout?: number;
        maxConnections?: number;
      }

      const extendedMeta = {
        [PORT_METADATA]: 5000,
        [GATEWAY_OPTIONS]: { 
          path: "/extended",
          timeout: 30000,
          maxConnections: 500,
        } as ExtendedGatewayOptions,
      };

      const discovery = new WebsocketGatewayDiscovery(extendedMeta);
      
      expect(discovery.getPort()).toBe(5000);
      expect(discovery.getOptions()).toEqual({
        path: "/extended",
        // @ts-expect-error Mismatch types
        timeout: 30000,
        maxConnections: 500,
      });
    });
  });

  describe("integration scenarios", () => {
    it("should work in a discovery pipeline", () => {
      const gatewayClass = class ChatGateway {};
      const gatewayHandler = jest.fn().mockReturnValue("chat-response");
      
      // Simulate discovery process
      gatewayDiscovery.setDiscovery({
        class: gatewayClass,
        handler: gatewayHandler,
      });

      // Verify complete discovery information
      expect(gatewayDiscovery.getClass()).toBe(gatewayClass);
      expect(gatewayDiscovery.getHandler()).toBe(gatewayHandler);
      expect(gatewayDiscovery.getPort()).toBe(8080);
      expect(gatewayDiscovery.getOptions().path).toBe("/socket");

      // Test handler execution
      const result = gatewayDiscovery.getHandler()!("test-message");
      expect(result).toBe("chat-response");
      expect(gatewayHandler).toHaveBeenCalledWith("test-message");
    });

    it("should handle multiple gateway discoveries", () => {
      const gateways = [
        {
          meta: { [PORT_METADATA]: 8001, [GATEWAY_OPTIONS]: { path: "/chat" } },
          class: class ChatGateway {},
          handler: jest.fn(),
        },
        {
          meta: { [PORT_METADATA]: 8002, [GATEWAY_OPTIONS]: { path: "/notifications" } },
          class: class NotificationGateway {},
          handler: jest.fn(),
        },
        {
          meta: { [PORT_METADATA]: 8003, [GATEWAY_OPTIONS]: { path: "/game" } },
          class: class GameGateway {},
          handler: jest.fn(),
        },
      ];

      const discoveries = gateways.map(gateway => {
        const discovery = new WebsocketGatewayDiscovery(gateway.meta);
        discovery.setDiscovery({ class: gateway.class, handler: gateway.handler });
        return discovery;
      });

      discoveries.forEach((discovery, index) => {
        expect(discovery.getPort()).toBe(8001 + index);
        expect(discovery.getClass()).toBe(gateways[index].class);
        expect(discovery.getHandler()).toBe(gateways[index].handler);
      });
    });
  });
});