import type { ArgumentsHost } from "@venok/core";

import { ExecutionContextHost } from "@venok/core";
import { beforeEach, describe, expect, it, spyOn } from "bun:test";

import { WebsocketArgumentsHost } from "~/websocket/arguments-host.js";

describe("WebsocketArgumentsHost", () => {
  let websocketHost: WebsocketArgumentsHost;
  let mockArgs: any[];

  beforeEach(() => {
    mockArgs = ["client", "data", "pattern"];
    websocketHost = new WebsocketArgumentsHost(mockArgs);
  });

  describe("constructor", () => {
    it("should create instance extending ExecutionContextHost", () => {
      expect(websocketHost).toBeInstanceOf(ExecutionContextHost);
      expect(websocketHost).toBeInstanceOf(WebsocketArgumentsHost);
    });

    it("should initialize with provided arguments", () => {
      expect(websocketHost.getArgs()).toEqual(mockArgs);
    });
  });

  describe("create", () => {
    it("should create WebsocketArgumentsHost from ArgumentsHost context", () => {
      const mockContext: ArgumentsHost = {
        getArgs: () => ["socket", "payload", "event"],
        getArgByIndex: (index: number) => ["socket", "payload", "event"][index],
        getType: () => "ws",
      } as any;

      const result = WebsocketArgumentsHost.create(mockContext);

      expect(result).toBeInstanceOf(WebsocketArgumentsHost);
      expect(result.getArgs()).toEqual(["socket", "payload", "event"]);
      expect(result.getType()).toBe("ws");
    });

    it("should preserve context type from original ArgumentsHost", () => {
      const mockContext: ArgumentsHost = {
        getArgs: () => ["client", "message"],
        getArgByIndex: (index: number) => ["client", "message"][index],
        getType: () => "websocket",
      } as any;

      const result = WebsocketArgumentsHost.create(mockContext);
      expect(result.getType()).toBe("websocket");
    });

    it("should work with empty arguments", () => {
      const mockContext: ArgumentsHost = {
        getArgs: () => [],
        getArgByIndex: () => undefined,
        getType: () => "ws",
      } as any;

      const result = WebsocketArgumentsHost.create(mockContext);
      expect(result.getArgs()).toEqual([]);
      expect(result.getType()).toBe("ws");
    });

    it("should call getType and getArgs methods on context", () => {
      const mockContext: ArgumentsHost = {
        getArgs: () => ["test"],
        getArgByIndex: (index: number) => ["test"][index],
        getType: () => "custom",
      } as any;

      const getTypeSpy = spyOn(mockContext, "getType");
      const getArgsSpy = spyOn(mockContext, "getArgs");

      WebsocketArgumentsHost.create(mockContext);

      expect(getTypeSpy).toHaveBeenCalledTimes(1);
      expect(getArgsSpy).toHaveBeenCalledTimes(1);

      getTypeSpy.mockRestore();
      getArgsSpy.mockRestore();
    });
  });

  describe("getClient", () => {
    it("should return first argument as client", () => {
      const client = { id: "client-123" };
      const data = { message: "hello" };
      const pattern = "test.event";
      
      const host = new WebsocketArgumentsHost([client, data, pattern]);
      expect(host.getClient<typeof client>()).toBe(client);
    });

    it("should return undefined when no arguments provided", () => {
      const host = new WebsocketArgumentsHost([]);
      expect(host.getClient()).toBeUndefined();
    });

    it("should return typed client", () => {
      interface MockClient {
        id: string;
        emit: (event: string, data: any) => void;
      }

      const client: MockClient = {
        id: "test-client",
        emit: () => {},
      };

      const host = new WebsocketArgumentsHost([client, "data", "pattern"]);
      const typedClient = host.getClient<MockClient>();
      
      expect(typedClient).toBe(client);
      expect(typedClient.id).toBe("test-client");
      expect(typeof typedClient.emit).toBe("function");
    });
  });

  describe("getData", () => {
    it("should return second argument as data", () => {
      const client = { id: "client-123" };
      const data = { message: "hello", timestamp: Date.now() };
      const pattern = "message.received";
      
      const host = new WebsocketArgumentsHost([client, data, pattern]);
      expect(host.getData<typeof data>()).toBe(data);
    });

    it("should return undefined when only one argument provided", () => {
      const host = new WebsocketArgumentsHost(["client"]);
      expect(host.getData()).toBeUndefined();
    });

    it("should return undefined when no arguments provided", () => {
      const host = new WebsocketArgumentsHost([]);
      expect(host.getData()).toBeUndefined();
    });

    it("should return typed data", () => {
      interface MessageData {
        text: string;
        userId: number;
      }

      const data: MessageData = {
        text: "Hello world",
        userId: 42,
      };

      const host = new WebsocketArgumentsHost(["client", data, "pattern"]);
      const typedData = host.getData<MessageData>();
      
      expect(typedData).toBe(data);
      expect(typedData.text).toBe("Hello world");
      expect(typedData.userId).toBe(42);
    });
  });

  describe("getPattern", () => {
    it("should return last argument as pattern", () => {
      const client = "client";
      const data = "data";
      const pattern = "chat.message";
      
      const host = new WebsocketArgumentsHost([client, data, pattern]);
      expect(host.getPattern()).toBe(pattern);
    });

    it("should return last argument even with single argument", () => {
      const singleArg = "only.pattern";
      const host = new WebsocketArgumentsHost([singleArg]);
      expect(host.getPattern()).toBe(singleArg);
    });

    it("should return undefined when no arguments provided", () => {
      const host = new WebsocketArgumentsHost([]);
      expect(host.getPattern()).toBeUndefined();
    });

    it("should handle various argument counts", () => {
      // Two arguments
      const twoArgsHost = new WebsocketArgumentsHost(["client", "pattern"]);
      expect(twoArgsHost.getPattern()).toBe("pattern");

      // Four arguments
      const fourArgsHost = new WebsocketArgumentsHost(["client", "data", "extra", "pattern"]);
      expect(fourArgsHost.getPattern()).toBe("pattern");

      // Many arguments
      const manyArgsHost = new WebsocketArgumentsHost([1, 2, 3, 4, 5, "final.pattern"]);
      expect(manyArgsHost.getPattern()).toBe("final.pattern");
    });
  });

  describe("getArgByIndex with ack function", () => {
    it("should return second to last argument as ack function via getArgByIndex", () => {
      const client = { id: "client-123" };
      const data = { message: "hello" };
      const ackFn = () => {};
      const pattern = "test.event";
      
      const host = new WebsocketArgumentsHost([client, data, ackFn, pattern]);
      expect(host.getArgByIndex<Function>(2)).toBe(ackFn);
    });

    it("should return undefined when only one argument provided", () => {
      const host = new WebsocketArgumentsHost(["pattern"]);
      expect(host.getArgByIndex(1)).toBeUndefined();
    });

    it("should return undefined when only two arguments provided", () => {
      const host = new WebsocketArgumentsHost(["client", "pattern"]);
      expect(host.getArgByIndex<string>(1)).toBe("pattern");
      expect(host.getArgByIndex(2)).toBeUndefined();
    });

    it("should access typed ack function via getArgByIndex", () => {
      type AckFunction = (response: { success: boolean; data?: any }) => void;
      
      const mockAck: AckFunction = (response) => {
        console.log(response);
      };

      const host = new WebsocketArgumentsHost(["client", "data", mockAck, "pattern"]);
      const typedAck = host.getArgByIndex(2);
      
      expect(typedAck).toBe(mockAck);
      expect(typeof typedAck).toBe("function");
    });

    it("should handle multiple extra parameters before ack via getArgByIndex", () => {
      const client = "client";
      const data = "data";
      const param1 = "extra1";
      const param2 = "extra2";
      const ackFn = () => {};
      const pattern = "event.pattern";
      
      const host = new WebsocketArgumentsHost([client, data, param1, param2, ackFn, pattern]);
      expect(host.getArgByIndex<Function>(4)).toBe(ackFn);
      expect(host.getArgByIndex<string>(5)).toBe(pattern);
    });
  });

  describe("integration scenarios", () => {
    it("should work with typical websocket message scenario", () => {
      const mockSocket = {
        id: "socket-123",
        emit: () => {},
        disconnect: () => {},
      };

      const messageData = {
        text: "Hello everyone!",
        userId: 42,
        timestamp: new Date().toISOString(),
      };

      const eventPattern = "chat.message";

      const host = new WebsocketArgumentsHost([mockSocket, messageData, eventPattern]);

      expect(host.getClient<typeof mockSocket>()).toBe(mockSocket);
      expect(host.getData<typeof messageData>()).toBe(messageData);
      expect(host.getPattern()).toBe(eventPattern);

      expect(host.getClient<typeof mockSocket>().id).toBe("socket-123");
      expect(host.getData<typeof messageData>().text).toBe("Hello everyone!");
      expect(host.getPattern()).toBe("chat.message");
    });

    it("should work with ack function scenario", () => {
      const mockSocket = {
        id: "socket-789",
        emit: () => {},
        disconnect: () => {},
      };

      const messageData = {
        text: "Message with acknowledgment",
        userId: 999,
      };

      const ackFunction = (success: boolean) => {
        console.log(`Message acknowledged: ${success}`);
      };

      const eventPattern = "message.with.ack";

      const host = new WebsocketArgumentsHost([mockSocket, messageData, ackFunction, eventPattern]);

      expect(host.getClient<typeof mockSocket>()).toBe(mockSocket);
      expect(host.getData<typeof messageData>()).toBe(messageData);
      expect(host.getArgByIndex<Function>(2)).toBe(ackFunction);
      expect(host.getPattern()).toBe(eventPattern);

      expect(host.getClient<typeof mockSocket>().id).toBe("socket-789");
      expect(host.getData<typeof messageData>().text).toBe("Message with acknowledgment");
      expect(typeof host.getArgByIndex(2)).toBe("function");
      expect(host.getPattern()).toBe("message.with.ack");
    });

    it("should work with additional parameters and ack function", () => {
      const mockSocket = { id: "complex-socket" };
      const messageData = { content: "Complex message" };
      const extraParam1 = { metadata: "some metadata" };
      const extraParam2 = { priority: "high" };
      const extraParam3 = { timestamp: Date.now() };
      const ackFunction = (result: any) => result;
      const eventPattern = "complex.event.pattern";

      const host = new WebsocketArgumentsHost([
        mockSocket,
        messageData,
        extraParam1,
        extraParam2,
        extraParam3,
        ackFunction,
        eventPattern,
      ]);

      expect(host.getClient<typeof mockSocket>()).toBe(mockSocket);
      expect(host.getData<typeof messageData>()).toBe(messageData);
      expect(host.getArgByIndex<Function>(5)).toBe(ackFunction);
      expect(host.getPattern()).toBe(eventPattern);

      // Extra parameters can be accessed via getArgByIndex
      expect(host.getArgByIndex<typeof extraParam1>(2)).toBe(extraParam1);
      expect(host.getArgByIndex<typeof extraParam2>(3)).toBe(extraParam2);
      expect(host.getArgByIndex<typeof extraParam3>(4)).toBe(extraParam3);
    });

    it("should work when created from ArgumentsHost context", () => {
      const originalArgs = [
        { socketId: "ws-456" },
        { event: "user.joined", userId: 123 },
        "room.events",
      ];

      const mockContext: ArgumentsHost = {
        getArgs: () => originalArgs,
        getArgByIndex: (index: number) => originalArgs[index],
        getType: () => "websocket",
      } as any;

      const wsHost = WebsocketArgumentsHost.create(mockContext);

      expect(wsHost.getClient<typeof originalArgs[0]>()).toEqual({ socketId: "ws-456" });
      expect(wsHost.getData<typeof originalArgs[2]>()).toEqual({ event: "user.joined", userId: 123 });
      expect(wsHost.getPattern()).toBe("room.events");
      expect(wsHost.getType()).toBe("websocket");
    });

    it("should work when created from ArgumentsHost context with ack", () => {
      const ackFunction = () => {};
      const originalArgsWithAck = [
        { socketId: "ws-with-ack" },
        { event: "user.action", payload: "data" },
        ackFunction,
        "room.events.ack",
      ];

      const mockContext: ArgumentsHost = {
        getArgs: () => originalArgsWithAck,
        getArgByIndex: (index: number) => originalArgsWithAck[index],
        getType: () => "websocket",
      } as any;

      const wsHost = WebsocketArgumentsHost.create(mockContext);

      expect(wsHost.getClient<typeof originalArgsWithAck[0]>()).toEqual({ socketId: "ws-with-ack" });
      expect(wsHost.getData<typeof originalArgsWithAck[1]>()).toEqual({ event: "user.action", payload: "data" });
      expect(wsHost.getArgByIndex<Function>(2)).toBe(ackFunction);
      expect(wsHost.getPattern()).toBe("room.events.ack");
      expect(wsHost.getType()).toBe("websocket");
    });

    it("should handle edge cases gracefully", () => {
      // Null values
      const nullHost = new WebsocketArgumentsHost([null, null, null]);
      expect(nullHost.getClient()).toBeNull();
      expect(nullHost.getData()).toBeNull();
      expect(nullHost.getPattern()).toBeNull();

      // Mixed types
      const mixedHost = new WebsocketArgumentsHost([
        { type: "socket" },
        "string-data",
        123,
      ]);
      // @ts-expect-error Mismatch types
      expect(mixedHost.getClient()).toEqual({ type: "socket" });
      // @ts-expect-error Mismatch types
      expect(mixedHost.getData()).toBe("string-data");
      // @ts-expect-error Mismatch types
      expect(mixedHost.getPattern()).toBe(123);
    });
  });
});