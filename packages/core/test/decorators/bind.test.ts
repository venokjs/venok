import { describe, expect, it } from "bun:test";
import { ROUTE_ARGS_METADATA } from "~/constants.js";
import { Bind } from "~/decorators/bind.decorator.js";
import { Inject } from "~/decorators/inject.decorator.js";

describe("@Bind", () => {
  class TestWithMethod {
    @Bind(Inject("Bind"))
    public test() {}
  }

  it.skip("should enhance method - bind each decorator to method", () => {
    const metadata = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      TestWithMethod,
      "test"
    );

    expect(metadata).toEqual({
      "0:0": {
        data: undefined,
        index: 0,
        pipes: [],
      },
    });
  });
});