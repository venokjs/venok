import { describe, expect, it } from "bun:test";
import { Dependencies } from "~/decorators/dependencies.decorator.js";
import { PARAMTYPES_METADATA } from "~/constants.js";

describe("@Dependencies", () => {
  const dep = "test",
        dep2 = "test2";
  const deps = [dep, dep2];

  @Dependencies(deps)
  class Test {}
  @Dependencies(dep, dep2)
  class Test2 {}

  it("should enhance class with expected dependencies array", () => {
    const metadata = Reflect.getMetadata(PARAMTYPES_METADATA, Test);
    expect(metadata).toEqual(deps);
  });

  it("should makes passed array flatten", () => {
    const metadata = Reflect.getMetadata(PARAMTYPES_METADATA, Test2);
    expect(metadata).toEqual([dep, dep2]);
  });
});