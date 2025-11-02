import { describe, expect, it } from "bun:test";

import { Global } from "~/decorators/global.decorator.js";
import { GLOBAL_MODULE_METADATA } from "~/constants.js";

describe("@Global", () => {
  @Global()
  class Test {}

  it("should enrich metatype with GlobalModule metadata", () => {
    const isGlobal = Reflect.getMetadata(GLOBAL_MODULE_METADATA, Test);
    expect(isGlobal).toBeTrue();
  });
});