import { describe, expect, it } from "bun:test";
import { UseFilters } from "~/decorators/exception-filters.decorator.js";
import { EXCEPTION_FILTERS_METADATA } from "~/constants.js";
import { InvalidDecoratorItemException } from "~/helpers/validate-each.helper.js";

class Filter {
  catch() {}
}

describe("@UseFilters", () => {
  const filters = [new Filter(), new Filter()];

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  @UseFilters(...(filters as any))
  class Test {}

  class TestWithMethod {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    @UseFilters(...(filters as any))
    public static test() {}
  }

  it("should enhance class with expected exception filters array", () => {
    const metadata = Reflect.getMetadata(EXCEPTION_FILTERS_METADATA, Test);
    expect(metadata).toEqual(filters);
  });

  it("should enhance method with expected exception filters array", () => {
    const metadata = Reflect.getMetadata(
      EXCEPTION_FILTERS_METADATA,
      TestWithMethod.test
    );
    expect(metadata).toEqual(filters);
  });

  it("when object is invalid should throw exception", () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      UseFilters("test" as any)(() => {});
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidDecoratorItemException);
    }
  });
});