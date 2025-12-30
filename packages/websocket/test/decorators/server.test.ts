/* eslint-disable @typescript-eslint/no-unused-vars */
import { afterEach, describe, expect, it, jest } from "bun:test";

import { WebsocketServer } from "~/decorators/server.decorator.js";
import { GATEWAY_SERVER_METADATA } from "~/constants.js";

describe("WebsocketServer", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("basic functionality", () => {
    it("should return a PropertyDecorator function", () => {
      const decorator = WebsocketServer();
      expect(typeof decorator).toBe("function");
    });

    it("should set property to null and define metadata", () => {
      class TestGateway {
        @WebsocketServer()
        server: any;
      }

      const instance = new TestGateway();
      
      expect(instance.server).toBeNull();
      expect(Reflect.getMetadata(GATEWAY_SERVER_METADATA, instance, "server")).toBe(true);
    });

    it("should work with string property keys", () => {
      class TestGateway {
        @WebsocketServer()
        socketServer: any;
      }

      const instance = new TestGateway();
      
      expect(instance.socketServer).toBeNull();
      expect(Reflect.getMetadata(GATEWAY_SERVER_METADATA, instance, "socketServer")).toBe(true);
    });

    it("should work with symbol property keys", () => {
      const serverSymbol = Symbol("server");
      
      class TestGateway {
        [serverSymbol]: any = undefined; // Must declare with initial value
      }

      const decorator = WebsocketServer();
      decorator(TestGateway.prototype, serverSymbol);

      const instance = new TestGateway();
      
      // Symbol properties behave differently - they inherit the prototype value
      expect(TestGateway.prototype[serverSymbol]).toBeNull();
      expect(Reflect.getMetadata(GATEWAY_SERVER_METADATA, instance, serverSymbol)).toBe(true);
    });
  });

  describe("multiple properties", () => {
    it("should handle multiple server properties on the same class", () => {
      class TestGateway {
        @WebsocketServer()
        server1: any;

        @WebsocketServer()
        server2: any;
      }

      const instance = new TestGateway();
      
      expect(instance.server1).toBeNull();
      expect(instance.server2).toBeNull();
      expect(Reflect.getMetadata(GATEWAY_SERVER_METADATA, instance, "server1")).toBe(true);
      expect(Reflect.getMetadata(GATEWAY_SERVER_METADATA, instance, "server2")).toBe(true);
    });

    it("should not interfere with other properties", () => {
      class TestGateway {
        @WebsocketServer()
        server: any;

        regularProperty = "test";
        anotherProperty: number = 42;
      }

      const instance = new TestGateway();
      
      expect(instance.server).toBeNull();
      expect(instance.regularProperty).toBe("test");
      expect(instance.anotherProperty).toBe(42);
      expect(Reflect.getMetadata(GATEWAY_SERVER_METADATA, instance, "server")).toBe(true);
      expect(Reflect.getMetadata(GATEWAY_SERVER_METADATA, instance, "regularProperty")).toBeUndefined();
      expect(Reflect.getMetadata(GATEWAY_SERVER_METADATA, instance, "anotherProperty")).toBeUndefined();
    });
  });

  describe("inheritance", () => {
    it("should work correctly with inheritance", () => {
      class BaseGateway {
        @WebsocketServer()
        baseServer: any;
      }

      class ExtendedGateway extends BaseGateway {
        @WebsocketServer()
        extendedServer: any;
      }

      const instance = new ExtendedGateway();
      
      expect(instance.baseServer).toBeNull();
      expect(instance.extendedServer).toBeNull();
      expect(Reflect.getMetadata(GATEWAY_SERVER_METADATA, instance, "baseServer")).toBe(true);
      expect(Reflect.getMetadata(GATEWAY_SERVER_METADATA, instance, "extendedServer")).toBe(true);
    });

    it("should maintain separate metadata for parent and child classes", () => {
      class ParentGateway {
        @WebsocketServer()
        server: any;
      }

      class ChildGateway extends ParentGateway {
        @WebsocketServer()
        childServer: any;
      }

      const parentInstance = new ParentGateway();
      const childInstance = new ChildGateway();
      
      expect(parentInstance.server).toBeNull();
      expect(childInstance.server).toBeNull();
      expect(childInstance.childServer).toBeNull();
      
      expect(Reflect.getMetadata(GATEWAY_SERVER_METADATA, parentInstance, "server")).toBe(true);
      expect(Reflect.getMetadata(GATEWAY_SERVER_METADATA, childInstance, "server")).toBe(true);
      expect(Reflect.getMetadata(GATEWAY_SERVER_METADATA, childInstance, "childServer")).toBe(true);
      expect(Reflect.getMetadata(GATEWAY_SERVER_METADATA, parentInstance, "childServer")).toBeUndefined();
    });
  });

  describe("metadata behavior", () => {
    it("should only set metadata for decorated properties", () => {
      class TestGateway {
        @WebsocketServer()
        server: any;

        nonDecoratedProperty: any = "test";
      }

      const instance = new TestGateway();
      
      expect(Reflect.getMetadata(GATEWAY_SERVER_METADATA, instance, "server")).toBe(true);
      expect(Reflect.getMetadata(GATEWAY_SERVER_METADATA, instance, "nonDecoratedProperty")).toBeUndefined();
    });

    it("should always set metadata to true", () => {
      class TestGateway {
        @WebsocketServer()
        server1: any;

        @WebsocketServer()
        server2: any;
      }

      const instance = new TestGateway();
      
      expect(Reflect.getMetadata(GATEWAY_SERVER_METADATA, instance, "server1")).toBe(true);
      expect(Reflect.getMetadata(GATEWAY_SERVER_METADATA, instance, "server2")).toBe(true);
    });

    it("should use the correct metadata key", () => {
      class TestGateway {
        @WebsocketServer()
        server: any;
      }

      const instance = new TestGateway();
      
      expect(Reflect.getMetadata(GATEWAY_SERVER_METADATA, instance, "server")).toBe(true);
      expect(Reflect.getMetadata("wrong-key", instance, "server")).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    it("should work when applied to properties with initial values", () => {
      class TestGateway {
        @WebsocketServer()
        server: any = "initial-value";
      }

      const instance = new TestGateway();
      
      // Initial values in class definition override the decorator's null setting
      expect(instance.server).toBe("initial-value");
      expect(Reflect.getMetadata(GATEWAY_SERVER_METADATA, instance, "server")).toBe(true);
    });

    it("should work when property is reassigned after decoration", () => {
      class TestGateway {
        @WebsocketServer()
        server: any;
      }

      const instance = new TestGateway();
      expect(instance.server).toBeNull();
      
      instance.server = "new-value";
      expect(instance.server).toBe("new-value");
      expect(Reflect.getMetadata(GATEWAY_SERVER_METADATA, instance, "server")).toBe(true);
    });

    it("should handle empty property names", () => {
      class TestGateway {}

      const decorator = WebsocketServer();
      decorator(TestGateway.prototype, "");

      const instance = new TestGateway();
      
      expect((instance as any)[""]).toBeNull();
      expect(Reflect.getMetadata(GATEWAY_SERVER_METADATA, instance, "")).toBe(true);
    });

    it("should work correctly when applied multiple times to different instances", () => {
      class TestGateway {
        @WebsocketServer()
        server: any;
      }

      const instance1 = new TestGateway();
      const instance2 = new TestGateway();
      
      expect(instance1.server).toBeNull();
      expect(instance2.server).toBeNull();
      expect(Reflect.getMetadata(GATEWAY_SERVER_METADATA, instance1, "server")).toBe(true);
      expect(Reflect.getMetadata(GATEWAY_SERVER_METADATA, instance2, "server")).toBe(true);
      
      instance1.server = "server1";
      expect(instance1.server).toBe("server1");
      expect(instance2.server).toBeNull();
    });
  });

  describe("reflection integration", () => {
    it("should properly integrate with Reflect.set", () => {
      class TestGateway {
        @WebsocketServer()
        server: any;
      }

      const instance = new TestGateway();
      
      Reflect.set(instance, "server", "manually-set-value");
      expect(instance.server).toBe("manually-set-value");
      expect(Reflect.getMetadata(GATEWAY_SERVER_METADATA, instance, "server")).toBe(true);
    });

    it("should work with Reflect.defineProperty", () => {
      class TestGateway {
        @WebsocketServer()
        server: any;
      }

      const instance = new TestGateway();
      
      Reflect.defineProperty(instance, "server", {
        value: "defined-value",
        writable: true,
        enumerable: true,
        configurable: true
      });
      
      expect(instance.server).toBe("defined-value");
      expect(Reflect.getMetadata(GATEWAY_SERVER_METADATA, instance, "server")).toBe(true);
    });
  });

  describe("metadata consistency", () => {
    it("should maintain metadata across property descriptor changes", () => {
      class TestGateway {
        @WebsocketServer()
        server: any;
      }

      const instance = new TestGateway();
      
      Object.defineProperty(instance, "server", {
        get: () => "getter-value",
        configurable: true
      });
      
      expect(instance.server).toBe("getter-value");
      expect(Reflect.getMetadata(GATEWAY_SERVER_METADATA, instance, "server")).toBe(true);
    });

    it("should work with frozen objects", () => {
      class TestGateway {
        @WebsocketServer()
        server: any;
      }

      const instance = new TestGateway();
      expect(instance.server).toBeNull();
      expect(Reflect.getMetadata(GATEWAY_SERVER_METADATA, instance, "server")).toBe(true);
      
      Object.freeze(instance);
      expect(Reflect.getMetadata(GATEWAY_SERVER_METADATA, instance, "server")).toBe(true);
    });
  });
});