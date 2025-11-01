import { describe, expect, it } from "bun:test";

import { UsePipes } from "~/decorators/use-pipes.decorator.js";
import { PIPES_METADATA } from "~/constants.js";
import { InvalidDecoratorItemException } from "~/helpers/validate-each.helper.js";

class Pipe {
  transform() {}
}

describe("@UsePipes", () => {
  const pipes = [new Pipe(), new Pipe()];

  @UsePipes(...pipes)
  class Test {}

  class TestWithMethod {
    @UsePipes(...pipes)
    public static test() {}
  }

  it("should enhance class with expected pipes array", () => {
    const metadata = Reflect.getMetadata(PIPES_METADATA, Test);
    expect(metadata).toEqual(pipes);
  });

  it("should enhance method with expected pipes array", () => {
    const metadata = Reflect.getMetadata(PIPES_METADATA, TestWithMethod.test);
    expect(metadata).toEqual(pipes);
  });

  it("when object is invalid should throw exception", () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      UsePipes("test" as any)(() => {});
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidDecoratorItemException);
    }
  });
});