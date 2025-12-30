import { describe, expect, it } from "bun:test";

import { isFunction } from "@venok/core";
import { WsParamsFactory } from "~/websocket/params-factory.js";
import { WsParamtype } from "~/enums/ws-paramtype.js";

describe("WsParamsFactory", () => {
  let factory: WsParamsFactory;

  // eslint-disable-next-line prefer-const
  factory = new WsParamsFactory();

  describe("exchangeKeyForValue", () => {
    describe("when args is null or undefined", () => {
      it("should return null", () => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const result = factory.exchangeKeyForValue(WsParamtype.SOCKET, undefined, null as any);
        expect(result).toBeNull();
      });
    });

    describe("when type is WsParamtype.SOCKET", () => {
      it("should return the socket (first argument)", () => {
        const socket = { id: "socket123" };
        const payload = { message: "hello" };
        const ackFn = () => {};
        const pattern = "event_name";
        const args: [any, any, any, string] = [socket, payload, ackFn, pattern];

        const result = factory.exchangeKeyForValue(WsParamtype.SOCKET, undefined, args);
        expect(result).toBe(socket);
      });
    });

    describe("when type is WsParamtype.PAYLOAD", () => {
      it("should return full payload when data is undefined", () => {
        const socket = { id: "socket123" };
        const payload = { message: "hello", user: "john" };
        const ackFn = () => {};
        const pattern = "event_name";
        const args: [any, any, any, string] = [socket, payload, ackFn, pattern];

        const result = factory.exchangeKeyForValue(WsParamtype.PAYLOAD, undefined, args);
        expect(result).toBe(payload);
      });

      it("should return specific property when data is specified", () => {
        const socket = { id: "socket123" };
        const payload = { message: "hello", user: "john" };
        const ackFn = () => {};
        const pattern = "event_name";
        const args: [any, any, any, string] = [socket, payload, ackFn, pattern];

        const result = factory.exchangeKeyForValue(WsParamtype.PAYLOAD, "message", args);
        expect(result).toBe("hello");
      });

      it("should return undefined when property doesn't exist", () => {
        const socket = { id: "socket123" };
        const payload = { message: "hello" };
        const ackFn = () => {};
        const pattern = "event_name";
        const args: [any, any, any, string] = [socket, payload, ackFn, pattern];

        const result = factory.exchangeKeyForValue(WsParamtype.PAYLOAD, "nonexistent", args);
        expect(result).toBeUndefined();
      });

      it("should return undefined when payload is null/undefined but data is specified", () => {
        const socket = { id: "socket123" };
        const payload = null;
        const ackFn = () => {};
        const pattern = "event_name";
        const args: [any, any, any, string] = [socket, payload, ackFn, pattern];

        const result = factory.exchangeKeyForValue(WsParamtype.PAYLOAD, "message", args);
        expect(result).toBeUndefined();
      });
    });

    describe("when type is WsParamtype.ACK", () => {
      it("should return acknowledgment function when present", () => {
        const socket = { id: "socket123" };
        const payload = { message: "hello" };
        const ackFn = () => {};
        const pattern = "event_name";
        const args: [any, any, any, string] = [socket, payload, ackFn, pattern];

        const result = factory.exchangeKeyForValue(WsParamtype.ACK, undefined, args);
        expect(result).toBe(ackFn);
        expect(isFunction(result)).toBe(true);
      });

      it("should return undefined when no function is present", () => {
        const socket = { id: "socket123" };
        const payload = { message: "hello" };
        const pattern = "event_name";
        const args: [any, any, string] = [socket, payload, pattern];

        const result = factory.exchangeKeyForValue(WsParamtype.ACK, undefined, args);
        expect(result).toBeUndefined();
      });

      it("should find function from multiple arguments", () => {
        const socket = { id: "socket123" };
        const payload = { message: "hello" };
        const nonFunction = "not a function";
        const ackFn = () => {};
        const pattern = "event_name";
        const args: [any, any, any, any, string] = [socket, payload, nonFunction, ackFn, pattern];

        const result = factory.exchangeKeyForValue(WsParamtype.ACK, undefined, args);
        expect(result).toBe(ackFn);
      });
    });

    describe("when type is WsParamtype.PATTERN", () => {
      it("should return the pattern (last argument)", () => {
        const socket = { id: "socket123" };
        const payload = { message: "hello" };
        const ackFn = () => {};
        const pattern = "event_name";
        const args: [any, any, any, string] = [socket, payload, ackFn, pattern];

        const result = factory.exchangeKeyForValue(WsParamtype.PATTERN, undefined, args);
        expect(result).toBe(pattern);
      });

      it("should return last argument even with different args length", () => {
        const socket = { id: "socket123" };
        const pattern = "simple_event";
        const args: [any, string] = [socket, pattern];

        // @ts-expect-error Mismatch types
        const result = factory.exchangeKeyForValue(WsParamtype.PATTERN, undefined, args);
        expect(result).toBe(pattern);
      });
    });

    describe("when type is unknown", () => {
      it("should return null for unknown param type", () => {
        const socket = { id: "socket123" };
        const payload = { message: "hello" };
        const ackFn = () => {};
        const pattern = "event_name";
        const args: [any, any, any, string] = [socket, payload, ackFn, pattern];

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const result = factory.exchangeKeyForValue(999 as any, undefined, args);
        expect(result).toBeNull();
      });
    });

    describe("edge cases", () => {
      it("should handle empty args array", () => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const result = factory.exchangeKeyForValue(WsParamtype.SOCKET, undefined, [] as any);
        expect(result).toBeUndefined();
      });

      it("should handle args with undefined values", () => {
        const args: [any, any, any, string] = [undefined, undefined, undefined, "pattern"];

        const socketResult = factory.exchangeKeyForValue(WsParamtype.SOCKET, undefined, args);
        expect(socketResult).toBeUndefined();

        const payloadResult = factory.exchangeKeyForValue(WsParamtype.PAYLOAD, undefined, args);
        expect(payloadResult).toBeUndefined();

        const patternResult = factory.exchangeKeyForValue(WsParamtype.PATTERN, undefined, args);
        expect(patternResult).toBe("pattern");
      });

      it("should handle nested property access", () => {
        const socket = { id: "socket123" };
        const payload = { user: { name: "john", age: 30 }, message: "hello" };
        const pattern = "event_name";
        const args: [any, any, string] = [socket, payload, pattern];

        const result = factory.exchangeKeyForValue(WsParamtype.PAYLOAD, "user", args);
        expect(result).toEqual({ name: "john", age: 30 });
      });
    });
  });
});