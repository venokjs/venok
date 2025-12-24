/* eslint-disable @typescript-eslint/no-unused-vars */
import type { PipeTransform } from "@venok/core";

import { Injectable, ROUTE_ARGS_METADATA } from "@venok/core";
import { afterEach, describe, expect, it, jest } from "bun:test";

import { MessageBody } from "~/decorators/message-body.decorator.js";
import { WsParamtype } from "~/enums/ws-paramtype.js";

@Injectable()
export class TestPipe implements PipeTransform<string> {
  async transform(value: string): Promise<number> {
    return parseInt(value, 10);
  }
}

@Injectable()
export class ValidationPipe implements PipeTransform {
  async transform(value: any): Promise<any> {
    return value;
  }
}

describe("MessageBody", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("when used without parameters", () => {
    it("should enhance parameter with WsParamtype.PAYLOAD and no data", () => {
      class TestController {
        public testMethod(@MessageBody() body: any) {}
      }

      const metadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        TestController,
        "testMethod"
      );

      const expectedKey = `${WsParamtype.PAYLOAD}:0`;
      expect(metadata[expectedKey]).toEqual({
        index: 0,
        data: undefined,
        pipes: [],
      });
    });
  });

  describe("when used with pipes only", () => {
    it("should enhance parameter with pipes array (instance)", () => {
      const testPipe = new TestPipe();

      class TestController {
        public testMethod(@MessageBody(testPipe) body: any) {}
      }

      const metadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        TestController,
        "testMethod"
      );

      const expectedKey = `${WsParamtype.PAYLOAD}:0`;
      expect(metadata[expectedKey]).toEqual({
        index: 0,
        data: undefined,
        pipes: [testPipe],
      });
    });

    it("should enhance parameter with pipes array (class)", () => {
      class TestController {
        public testMethod(@MessageBody(TestPipe) body: any) {}
      }

      const metadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        TestController,
        "testMethod"
      );

      const expectedKey = `${WsParamtype.PAYLOAD}:0`;
      expect(metadata[expectedKey]).toEqual({
        index: 0,
        data: undefined,
        pipes: [TestPipe],
      });
    });

    it("should enhance parameter with multiple pipes", () => {
      const testPipe = new TestPipe();
      const validationPipe = new ValidationPipe();

      class TestController {
        public testMethod(@MessageBody(testPipe, validationPipe) body: any) {}
      }

      const metadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        TestController,
        "testMethod"
      );

      const expectedKey = `${WsParamtype.PAYLOAD}:0`;
      expect(metadata[expectedKey]).toEqual({
        index: 0,
        data: undefined,
        pipes: [testPipe, validationPipe],
      });
    });

    it("should enhance parameter with mixed pipe types", () => {
      const testPipe = new TestPipe();

      class TestController {
        public testMethod(@MessageBody(testPipe, ValidationPipe) body: any) {}
      }

      const metadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        TestController,
        "testMethod"
      );

      const expectedKey = `${WsParamtype.PAYLOAD}:0`;
      expect(metadata[expectedKey]).toEqual({
        index: 0,
        data: undefined,
        pipes: [testPipe, ValidationPipe],
      });
    });
  });

  describe("when used with property key", () => {
    it("should enhance parameter with property key as data", () => {
      class TestController {
        public testMethod(@MessageBody("data") body: any) {}
      }

      const metadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        TestController,
        "testMethod"
      );

      const expectedKey = `${WsParamtype.PAYLOAD}:0`;
      expect(metadata[expectedKey]).toEqual({
        index: 0,
        data: "data",
        pipes: [],
      });
    });

    it("should enhance parameter with property key and single pipe", () => {
      const testPipe = new TestPipe();

      class TestController {
        public testMethod(@MessageBody("data", testPipe) body: any) {}
      }

      const metadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        TestController,
        "testMethod"
      );

      const expectedKey = `${WsParamtype.PAYLOAD}:0`;
      expect(metadata[expectedKey]).toEqual({
        index: 0,
        data: "data",
        pipes: [testPipe],
      });
    });

    it("should enhance parameter with property key and multiple pipes", () => {
      const testPipe = new TestPipe();
      const validationPipe = new ValidationPipe();

      class TestController {
        public testMethod(
          @MessageBody("data", testPipe, validationPipe) body: any
        ) {}
      }

      const metadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        TestController,
        "testMethod"
      );

      const expectedKey = `${WsParamtype.PAYLOAD}:0`;
      expect(metadata[expectedKey]).toEqual({
        index: 0,
        data: "data",
        pipes: [testPipe, validationPipe],
      });
    });

    it("should enhance parameter with property key and pipe classes", () => {
      class TestController {
        public testMethod(
          @MessageBody("data", TestPipe, ValidationPipe) body: any
        ) {}
      }

      const metadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        TestController,
        "testMethod"
      );

      const expectedKey = `${WsParamtype.PAYLOAD}:0`;
      expect(metadata[expectedKey]).toEqual({
        index: 0,
        data: "data",
        pipes: [TestPipe, ValidationPipe],
      });
    });
  });

  describe("when used with different parameter indexes", () => {
    it("should correctly set index for different parameter positions", () => {
      class TestController {
        public testMethod(
          firstParam: string,
          @MessageBody() secondParam: any,
          thirdParam: number,
          @MessageBody("data") fourthParam: any
        ) {}
      }

      const metadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        TestController,
        "testMethod"
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const keys = Object.keys(metadata);
      expect(keys).toHaveLength(2);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const secondParamMetadata = Object.values(metadata).find((meta: any) => meta.index === 1);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const fourthParamMetadata = Object.values(metadata).find((meta: any) => meta.index === 3);

      expect(secondParamMetadata).toEqual({
        index: 1,
        data: undefined,
        pipes: [],
      });

      expect(fourthParamMetadata).toEqual({
        index: 3,
        data: "data",
        pipes: [],
      });
    });
  });

  describe("when used with various data types", () => {
    it("should handle string property keys", () => {
      class TestController {
        public testMethod(@MessageBody("message") body: any) {}
      }

      const metadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        TestController,
        "testMethod"
      );

      const expectedKey = `${WsParamtype.PAYLOAD}:0`;
      expect(metadata[expectedKey].data).toBe("message");
    });

    it("should handle nested property keys", () => {
      class TestController {
        public testMethod(@MessageBody("user.id") body: any) {}
      }

      const metadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        TestController,
        "testMethod"
      );

      const expectedKey = `${WsParamtype.PAYLOAD}:0`;
      expect(metadata[expectedKey].data).toBe("user.id");
    });

    it("should handle empty string as property key", () => {
      class TestController {
        public testMethod(@MessageBody("") body: any) {}
      }

      const metadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        TestController,
        "testMethod"
      );

      const expectedKey = `${WsParamtype.PAYLOAD}:0`;
      expect(metadata[expectedKey].data).toBe("");
    });
  });

  describe("when used on multiple methods", () => {
    it("should not interfere between different methods", () => {
      class TestController {
        public methodOne(@MessageBody("data1") body1: any) {}

        public methodTwo(@MessageBody("data2") body2: any) {}
      }

      const metadata1 = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        TestController,
        "methodOne"
      );
      const metadata2 = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        TestController,
        "methodTwo"
      );

      const expectedKey = `${WsParamtype.PAYLOAD}:0`;

      expect(metadata1[expectedKey].data).toBe("data1");
      expect(metadata2[expectedKey].data).toBe("data2");
    });
  });

  describe("integration with WsParamtype", () => {
    it("should always use WsParamtype.PAYLOAD regardless of usage", () => {
      class TestController {
        public testMethod1(@MessageBody() body1: any) {}
        public testMethod2(@MessageBody("data") body2: any) {}
        public testMethod3(@MessageBody(new TestPipe()) body3: any) {}
        public testMethod4(@MessageBody("data", new TestPipe()) body4: any) {}
      }

      const methods = ["testMethod1", "testMethod2", "testMethod3", "testMethod4"];
      
      methods.forEach(method => {
        const metadata = Reflect.getMetadata(
          ROUTE_ARGS_METADATA,
          TestController,
          method
        );
        const key = Object.keys(metadata as object)[0];
        expect(key.startsWith(`${WsParamtype.PAYLOAD}:`)).toBe(true);
      });
    });
  });

  describe("edge cases", () => {
    it("should handle null as data", () => {
      class TestController {
        // @ts-expect-error Mismatch types
        public testMethod(@MessageBody(null) body: any) {}
      }

      const metadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        TestController,
        "testMethod"
      );

      const expectedKey = `${WsParamtype.PAYLOAD}:0`;
      expect(metadata[expectedKey].data).toBeUndefined();
    });

    it("should handle undefined as explicit data", () => {
      class TestController {
        // @ts-expect-error Mismatch types
        public testMethod(@MessageBody(undefined) body: any) {}
      }

      const metadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        TestController,
        "testMethod"
      );

      const expectedKey = `${WsParamtype.PAYLOAD}:0`;
      expect(metadata[expectedKey].data).toBeUndefined();
    });

    it("should handle number as data", () => {
      class TestController {
        public testMethod(@MessageBody(123) body: any) {}
      }

      const metadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        TestController,
        "testMethod"
      );

      const expectedKey = `${WsParamtype.PAYLOAD}:0`;
      expect(metadata[expectedKey].data).toBe(123);
    });

    it("should handle boolean as data", () => {
      class TestController {
        // @ts-expect-error Mismatch types
        public testMethod(@MessageBody(true) body: any) {}
      }

      const metadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        TestController,
        "testMethod"
      );

      const expectedKey = `${WsParamtype.PAYLOAD}:0`;
      expect(metadata[expectedKey].data).toBeUndefined();
    });

    it("should handle object as data", () => {
      const dataObj = { key: "value" };

      class TestController {
        // @ts-expect-error Mismatch types
        public testMethod(@MessageBody(dataObj) body: any) {}
      }

      const metadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        TestController,
        "testMethod"
      );

      const expectedKey = `${WsParamtype.PAYLOAD}:0`;
      expect(metadata[expectedKey].data).toBeUndefined();
    });
  });
});