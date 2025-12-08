/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-argument */
import type { PipeTransform } from "~/interfaces/index.js";

import { beforeEach, describe, expect, it } from "bun:test";

import { createParamDecorator } from "~/helpers/create-param-decorator.helper.js";
import { ROUTE_ARGS_METADATA } from "~/constants.js";
import { Injectable } from "~/decorators/injectable.decorator.js";

@Injectable()
export class ParseIntPipe implements PipeTransform<string> {
  async transform(value: string): Promise<number> {
    return parseInt(value, 10);
  }
}

describe("createParamDecorator", () => {
  let result: any;

  beforeEach(() => {
    const fn = (data: any, req: any) => true;
    result = createParamDecorator(fn);
  });
  it("should return a function as a first element", () => {
    expect(typeof result).toBe("function");
  });
  describe("returned decorator", () => {
    const factoryFn = (data: any, req: any) => true;
    const Decorator = createParamDecorator(factoryFn);

    describe("when 0 pipes have been passed", () => {
      const data = { data: "test" };
      class Test {
        public test(@Decorator(data) param: any) {}
      }
      it('should enhance param with "data"', () => {
        const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, "test");
        const key = Object.keys(metadata)[0];
        expect(metadata[key]).toEqual({
          data,
          factory: factoryFn,
          index: 0,
          pipes: [],
        });
      });
    });

    describe("when > 0 pipes have been passed", () => {
      const data = "test";
      const pipe = new ParseIntPipe();
      class Test {
        public test(@Decorator(data, pipe) param: any) {}

        public testNoData(@Decorator(pipe) param: any) {}

        public testNoDataClass(@Decorator(ParseIntPipe) param: any) {}
      }
      it('should enhance param with "data" and ParseIntPipe', () => {
        const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, "test");
        const key = Object.keys(metadata)[0];
        expect(metadata[key]).toEqual({
          data: "test",
          factory: factoryFn,
          index: 0,
          pipes: [pipe],
        });
      });

      it("should enhance param with ParseIntPipe", () => {
        const metadata = Reflect.getMetadata(
          ROUTE_ARGS_METADATA,
          Test,
          "testNoData"
        );
        const key = Object.keys(metadata)[0];
        expect(metadata[key]).toEqual({
          data: undefined,
          factory: factoryFn,
          index: 0,
          pipes: [pipe],
        });
      });

      it("should enhance param with ParseIntPipe metatype", () => {
        const metadata = Reflect.getMetadata(
          ROUTE_ARGS_METADATA,
          Test,
          "testNoDataClass"
        );
        const key = Object.keys(metadata)[0];
        expect(metadata[key]).toEqual({
          data: undefined,
          factory: factoryFn,
          index: 0,
          pipes: [ParseIntPipe],
        });
      });
    });

    describe("when class type passed as data", () => {
      class Data {}
      class Test {
        public test(@Decorator(Data) prop: any) {}
      }

      it("should return class type as data parameter", () => {
        const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, "test");
        const key = Object.keys(metadata)[0];
        expect(metadata[key].data).toBe(Data);
      });
    });
  });

  describe("returned generic typed decorator", () => {
    const factoryFn = (data: any, req: any) => true;
    interface User {
      name: string;
    }

    const stringOnlyDecorator = createParamDecorator<string>(factoryFn);
    const stringOrNumberDecorator = createParamDecorator<string | number>(
      factoryFn
    );
    const customTypeDecorator = createParamDecorator<User>(factoryFn);

    describe("when string is passed to stringOnlyDecorator", () => {
      const data = "test";
      class Test {
        public test(@stringOnlyDecorator(data) param: any) {}
      }
      it('should enhance param with "data" as string', () => {
        const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, "test");
        const key = Object.keys(metadata)[0];
        expect(metadata[key]).toEqual({
          data: "test",
          factory: factoryFn,
          index: 0,
          pipes: [],
        });
      });
    });

    describe("when number is passed to stringOrNumberDecorator", () => {
      const data = 10;
      class Test {
        public test(@stringOrNumberDecorator(data) param: any) {}
      }
      it('should enhance param with "data" as number', () => {
        const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, "test");
        const key = Object.keys(metadata)[0];
        expect(metadata[key]).toEqual({
          data: 10,
          factory: factoryFn,
          index: 0,
          pipes: [],
        });
      });
    });
    describe("when a custom Type is passed to customTypeDecorator", () => {
      const data = { name: "john" };
      class Test {
        public test(@customTypeDecorator(data) param: any) {}
      }
      it('should enhance param with "data" as custom Type', () => {
        const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, "test");
        const key = Object.keys(metadata)[0];
        expect(metadata[key]).toEqual({
          data: { name: "john" },
          factory: factoryFn,
          index: 0,
          pipes: [],
        });
      });
    });
  });
});