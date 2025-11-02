import { describe, expect, it } from "bun:test";
import { UseGuards } from "~/decorators/use-guards.decorator.js";
import { GUARDS_METADATA } from "~/constants.js";
import { InvalidDecoratorItemException } from "~/helpers/validate-each.helper.js";

class Guard {}

describe("@UseGuards", () => {
  const guards = [Guard, Guard];

  @UseGuards(...guards)
  class Test {}

  class TestWithMethod {
    @UseGuards(...guards)
    public static test() {}
  }

  class Test2 {
    @UseGuards(...guards)
    @UseGuards(...guards)
    public static test() {}
  }

  it("should enhance class with expected guards array", () => {
    const metadata = Reflect.getMetadata(GUARDS_METADATA, Test);
    expect(metadata).toEqual(guards);
  });

  it("should enhance method with expected guards array", () => {
    const metadata = Reflect.getMetadata(GUARDS_METADATA, TestWithMethod.test);
    expect(metadata).toEqual(guards);
  });

  it("should enhance method with multiple guards array", () => {
    const metadata = Reflect.getMetadata(GUARDS_METADATA, Test2.test);
    expect(metadata).toEqual(guards.concat(guards));
  });

  it("should throw exception when object is invalid", () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      UseGuards("test" as any)(() => {});
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidDecoratorItemException);
    }
  });
});