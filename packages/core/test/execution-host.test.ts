import type { Type } from "~/interfaces/index.js";

import { beforeEach, describe, expect, it } from "bun:test";

import { ExecutionContextHost } from "~/context/execution-host.js";

describe("ExecutionContextHost", () => {
  let executionHost: ExecutionContextHost;
  let mockConstructorRef: Type;
  let mockHandler: Function;
  let mockArgs: any[];

  beforeEach(() => {
    mockArgs = [1, 2, 3, "test"];
    mockConstructorRef = class TestClass {} as Type;
    mockHandler = () => "test handler";
    executionHost = new ExecutionContextHost(
      mockArgs,
      mockConstructorRef,
      mockHandler
    );
  });

  describe("constructor", () => {
    it("should create an instance with provided arguments", () => {
      expect(executionHost).toBeInstanceOf(ExecutionContextHost);
    });

    it("should set default context type to 'native'", () => {
      expect(executionHost.getType()).toBe("native");
    });

    it("should allow null constructor reference", () => {
      const hostWithNullConstructor = new ExecutionContextHost(
        mockArgs,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        null as any,
        mockHandler
      );
      expect(hostWithNullConstructor.getClass()).toBeNull();
    });

    it("should allow null handler", () => {
      const hostWithNullHandler = new ExecutionContextHost(
        mockArgs,
        mockConstructorRef,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        null as any
      );
      expect(hostWithNullHandler.getHandler()).toBeNull();
    });
  });

  describe("setType", () => {
    it("should set the context type", () => {
      executionHost.setType("custom");
      expect(executionHost.getType()).toBe("custom");
    });

    it("should not change type when null is passed", () => {
      const originalType = executionHost.getType();
      executionHost.setType(null as any);
      expect(executionHost.getType()).toBe(originalType);
    });

    it("should not change type when undefined is passed", () => {
      const originalType = executionHost.getType();
      executionHost.setType(undefined as any);
      expect(executionHost.getType()).toBe(originalType);
    });

    it("should not change type when empty string is passed", () => {
      const originalType = executionHost.getType();
      executionHost.setType("");
      expect(executionHost.getType()).toBe(originalType);
    });

    it("should set type to custom string", () => {
      executionHost.setType("http");
      expect(executionHost.getType()).toBe("http");
    });
  });

  describe("getType", () => {
    it("should return the current context type", () => {
      expect(executionHost.getType()).toBe("native");
    });

    it("should return typed context", () => {
      executionHost.setType("websocket");
      const type = executionHost.getType<"websocket">();
      expect(type).toBe("websocket");
    });
  });

  describe("getClass", () => {
    it("should return the constructor reference", () => {
      expect(executionHost.getClass()).toBe(mockConstructorRef);
    });

    it("should return null when constructor was null", () => {
      const hostWithNullConstructor = new ExecutionContextHost(
        mockArgs,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        null as any,
        mockHandler
      );
      expect(hostWithNullConstructor.getClass()).toBeNull();
    });

    it("should return typed class reference", () => {
      class SpecificClass {
        testMethod() {}
      }
      const specificHost = new ExecutionContextHost(
        mockArgs,
        SpecificClass as Type,
        mockHandler
      );
      const classRef = specificHost.getClass<SpecificClass>();
      expect(classRef).toBe(SpecificClass);
    });
  });

  describe("getHandler", () => {
    it("should return the handler function", () => {
      expect(executionHost.getHandler()).toBe(mockHandler);
    });

    it("should return null when handler was null", () => {
      const hostWithNullHandler = new ExecutionContextHost(
        mockArgs,
        mockConstructorRef,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        null as any
      );
      expect(hostWithNullHandler.getHandler()).toBeNull();
    });
  });

  describe("getArgs", () => {
    it("should return all arguments", () => {
      expect(executionHost.getArgs()).toEqual(mockArgs);
    });

    it("should return the same array reference", () => {
      expect(executionHost.getArgs()).toBe(mockArgs);
    });

    it("should return typed arguments array", () => {
      const typedArgs: [number, string] = [42, "hello"];
      const typedHost = new ExecutionContextHost(
        typedArgs,
        mockConstructorRef,
        mockHandler
      );
      const args = typedHost.getArgs<[number, string]>();
      expect(args).toEqual([42, "hello"]);
    });

    it("should return empty array when no arguments provided", () => {
      const emptyHost = new ExecutionContextHost(
        [],
        mockConstructorRef,
        mockHandler
      );
      expect(emptyHost.getArgs()).toEqual([]);
    });
  });

  describe("getArgByIndex", () => {
    it("should return argument at specific index", () => {
      // @ts-expect-error Mismatch types
      expect(executionHost.getArgByIndex(0)).toBe(1);
      // @ts-expect-error Mismatch types
      expect(executionHost.getArgByIndex(1)).toBe(2);
      // @ts-expect-error Mismatch types
      expect(executionHost.getArgByIndex(2)).toBe(3);
      // @ts-expect-error Mismatch types
      expect(executionHost.getArgByIndex(3)).toBe("test");
    });

    it("should return undefined for out of bounds index", () => {
      expect(executionHost.getArgByIndex(10)).toBeUndefined();
      expect(executionHost.getArgByIndex(-1)).toBeUndefined();
    });

    it("should return typed argument", () => {
      const stringArg = executionHost.getArgByIndex<string>(3);
      expect(stringArg).toBe("test");
      expect(typeof stringArg).toBe("string");
    });

    it("should handle edge cases with various argument types", () => {
      const complexArgs = [
        null,
        undefined,
        0,
        false,
        "",
        [],
        {},
        Symbol("test"),
        BigInt(123),
      ];
      const complexHost = new ExecutionContextHost(
        complexArgs,
        mockConstructorRef,
        mockHandler
      );

      expect(complexHost.getArgByIndex(0)).toBeNull();
      expect(complexHost.getArgByIndex(1)).toBeUndefined();
      // @ts-expect-error Mismatch types
      expect(complexHost.getArgByIndex(2)).toBe(0);
      // @ts-expect-error Mismatch types
      expect(complexHost.getArgByIndex(3)).toBe(false);
      // @ts-expect-error Mismatch types
      expect(complexHost.getArgByIndex(4)).toBe("");
      // @ts-expect-error Mismatch types
      expect(complexHost.getArgByIndex(5)).toEqual([]);
      // @ts-expect-error Mismatch types
      expect(complexHost.getArgByIndex(6)).toEqual({});
      expect(typeof complexHost.getArgByIndex(7)).toBe("symbol");
      expect(typeof complexHost.getArgByIndex(8)).toBe("bigint");
    });
  });

  describe("interface compliance", () => {
    it("should implement ArgumentsHost interface", () => {
      expect(typeof executionHost.getArgs).toBe("function");
      expect(typeof executionHost.getArgByIndex).toBe("function");
      expect(typeof executionHost.getType).toBe("function");
    });

    it("should implement ExecutionContext interface", () => {
      expect(typeof executionHost.getClass).toBe("function");
      expect(typeof executionHost.getHandler).toBe("function");
    });
  });

  describe("integration scenarios", () => {
    it("should work with typical HTTP request scenario", () => {
      const req = { url: "/test", method: "GET" };
      const res = { status: 200 };
      const next = () => {};
      
      class TestController {
        handleRequest() {}
      }

      const httpHost = new ExecutionContextHost(
        [req, res, next],
        TestController as Type,
        TestController.prototype.handleRequest
      );

      httpHost.setType("http");

      expect(httpHost.getType()).toBe("http");
      expect(httpHost.getArgs()).toEqual([req, res, next]);
      expect(httpHost.getClass()).toBe(TestController);
      expect(httpHost.getHandler()).toBe(TestController.prototype.handleRequest);
      // @ts-expect-error Mismatch types
      expect(httpHost.getArgByIndex(0)).toBe(req);
      // @ts-expect-error Mismatch types
      expect(httpHost.getArgByIndex(1)).toBe(res);
      // @ts-expect-error Mismatch types
      expect(httpHost.getArgByIndex(2)).toBe(next);
    });

    it("should work with WebSocket scenario", () => {
      const client = { id: "client-123" };
      const data = { message: "hello" };

      class WebSocketGateway {
        handleMessage() {}
      }

      const wsHost = new ExecutionContextHost(
        [client, data],
        WebSocketGateway as Type,
        WebSocketGateway.prototype.handleMessage
      );

      wsHost.setType("ws");

      expect(wsHost.getType()).toBe("ws");
      expect(wsHost.getArgs()).toEqual([client, data]);
      expect(wsHost.getClass()).toBe(WebSocketGateway);
      expect(wsHost.getHandler()).toBe(WebSocketGateway.prototype.handleMessage);
    });

    it("should work with minimal configuration", () => {
      const minimalHost = new ExecutionContextHost([]);

      expect(minimalHost.getType()).toBe("native");
      expect(minimalHost.getArgs()).toEqual([]);
      expect(minimalHost.getClass()).toBeNull();
      expect(minimalHost.getHandler()).toBeNull();
      expect(minimalHost.getArgByIndex(0)).toBeUndefined();
    });
  });
});