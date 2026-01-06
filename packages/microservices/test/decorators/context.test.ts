import { ROUTE_ARGS_METADATA } from "@venok/core";
import { describe, expect, it } from "bun:test";
import { Context } from "~/decorators/context.decorator.js";
import { MicroserviceParamtype } from "~/enums/microservice-paramtype.js";

class CtxTest {
  public test(@Context() ctx: any) {}
}

describe("@Context", () => {
  it("should enhance class with expected request metadata", () => {
    const argsMetadata = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      CtxTest,
      "test"
    );
    const expectedMetadata = {
      [`${MicroserviceParamtype.CONTEXT}:0`]: {
        data: undefined,
        index: 0,
        pipes: [],
      },
    };
    expect(argsMetadata).toEqual(expectedMetadata);
  });
});