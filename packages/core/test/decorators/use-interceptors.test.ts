import { describe, expect, it } from "bun:test";
import { UseInterceptors } from "~/decorators/use-interceptors.decorator.js";
import { INTERCEPTORS_METADATA } from "~/constants.js";
import { InvalidDecoratorItemException } from "~/helpers/validate-each.helper.js";

class Interceptor {}

describe("@UseInterceptors", () => {
  const interceptors = [Interceptor, Interceptor];

  @UseInterceptors(...interceptors)
  class Test {}

  class TestWithMethod {
    @UseInterceptors(...interceptors)
    public static test() {}
  }

  it("should enhance class with expected interceptors array", () => {
    const metadata = Reflect.getMetadata(INTERCEPTORS_METADATA, Test);
    expect(metadata).toEqual(interceptors);
  });

  it("should enhance method with expected interceptors array", () => {
    const metadata = Reflect.getMetadata(
      INTERCEPTORS_METADATA,
      TestWithMethod.test
    );
    expect(metadata).toEqual(interceptors);
  });

  it("when object is invalid should throw exception", () => {
    let error = undefined;
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      UseInterceptors("test" as any)({ name: "target" } as any);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(InvalidDecoratorItemException);
  });

  it("when object is valid should not throw exception", () => {
    let error = undefined;
    try {
      UseInterceptors({
        intercept() {
          return null!;
        },
      })({ name: "target" } as any);
    } catch (e) {
      error = e;
    }
    expect(error).toBeUndefined();
  });
});