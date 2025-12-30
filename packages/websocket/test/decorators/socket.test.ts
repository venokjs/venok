/* eslint-disable @typescript-eslint/no-unused-vars */
import { afterEach, describe, expect, it, jest } from "bun:test";
import { ROUTE_ARGS_METADATA } from "@venok/core";

import { Socket } from "~/decorators/socket.decorator.js";
import { WsParamtype } from "~/enums/ws-paramtype.js";

describe("Socket", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("basic functionality", () => {
    it("should return a ParameterDecorator function", () => {
      const decorator = Socket();
      expect(typeof decorator).toBe("function");
    });

    it("should enhance parameter with WsParamtype.SOCKET and no data when called without arguments", () => {
      class TestController {
        public testMethod(@Socket() socket: any) {}
      }

      const metadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        TestController,
        "testMethod"
      );

      const expectedKey = `${WsParamtype.SOCKET}:0`;
      expect(metadata[expectedKey]).toEqual({
        index: 0,
        data: undefined,
        pipes: [],
      });
    });
  });

  describe("parameter indexing", () => {
    it("should correctly set index for different parameter positions", () => {
      class TestController {
        public testMethod(
          firstParam: string,
          @Socket() secondParam: any,
          thirdParam: number,
          @Socket() fourthParam: any
        ) {}
      }

      const metadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        TestController,
        "testMethod"
      );

      const keys = Object.keys(metadata as object);
      expect(keys).toHaveLength(2);

      const secondParamMetadata = Object.values(metadata as object).find((meta: any) => meta.index === 1);
      const fourthParamMetadata = Object.values(metadata as object).find((meta: any) => meta.index === 3);

      expect(secondParamMetadata).toEqual({
        index: 1,
        data: undefined,
        pipes: [],
      });

      expect(fourthParamMetadata).toEqual({
        index: 3,
        data: undefined,
        pipes: [],
      });
    });

    it("should handle multiple socket parameters in the same method", () => {
      class TestController {
        public testMethod(
          @Socket() socket1: any,
          @Socket() socket2: any,
          @Socket() socket3: any
        ) {}
      }

      const metadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        TestController,
        "testMethod"
      );

      const keys = Object.keys(metadata as object);
      expect(keys).toHaveLength(3);

      const socket1Metadata = Object.values(metadata as object).find((meta: any) => meta.index === 0);
      const socket2Metadata = Object.values(metadata as object).find((meta: any) => meta.index === 1);
      const socket3Metadata = Object.values(metadata as object).find((meta: any) => meta.index === 2);

      expect(socket1Metadata).toEqual({
        index: 0,
        data: undefined,
        pipes: [],
      });

      expect(socket2Metadata).toEqual({
        index: 1,
        data: undefined,
        pipes: [],
      });

      expect(socket3Metadata).toEqual({
        index: 2,
        data: undefined,
        pipes: [],
      });
    });
  });

  describe("integration with WsParamtype", () => {
    it("should always use WsParamtype.SOCKET regardless of usage", () => {
      class TestController {
        public method1(@Socket() socket1: any) {}
        public method2(@Socket() socket2: any) {}
        public method3(@Socket() socket3: any) {}
        public method4(@Socket() socket4: any) {}
      }

      const methods = ["method1", "method2", "method3", "method4"];
      
      methods.forEach(method => {
        const metadata = Reflect.getMetadata(
          ROUTE_ARGS_METADATA,
          TestController,
          method
        );
        const key = Object.keys(metadata as object)[0];
        expect(key.startsWith(`${WsParamtype.SOCKET}:`)).toBe(true);
      });
    });

    it("should create correct metadata key format", () => {
      class TestController {
        public testMethod(@Socket() socket: any) {}
      }

      const metadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        TestController,
        "testMethod"
      );

      const keys = Object.keys(metadata as object);
      expect(keys).toHaveLength(1);
      expect(keys[0]).toBe(`${WsParamtype.SOCKET}:0`);
    });
  });
});