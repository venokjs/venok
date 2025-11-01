/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, expect, it } from "bun:test";
import { Inject } from "~/decorators/inject.decorator.js";
import { SELF_DECLARED_DEPS_METADATA } from "~/constants.js";

describe("@Inject", () => {
  const opaqueToken = () => ({});
  class Test {
    constructor(
      @Inject("test") param: any,
      @Inject("test2") param2: any,
      @Inject(opaqueToken) param3: any
    ) {}
  }

  it("should enhance class with expected constructor params metadata", () => {
    const metadata = Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, Test);

    const expectedMetadata = [
      { index: 2, param: opaqueToken },
      { index: 1, param: "test2" },
      { index: 0, param: "test" },
    ];
    expect(metadata).toEqual(expectedMetadata);
  });
});