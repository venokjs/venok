import { describe, expect, it } from "bun:test";
import { CATCH_WATERMARK, FILTER_CATCH_EXCEPTIONS } from "~/constants.js";
import { Catch } from "~/decorators/catch.decorator.js";

describe("@Catch", () => {
  const exceptions: any = ["exception", "exception2"];

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  @Catch(...exceptions)
  class Test {}

  it(`should enhance component with "${CATCH_WATERMARK}" metadata`, () => {
    const catchWatermark = Reflect.getMetadata(CATCH_WATERMARK, Test);

    expect(catchWatermark).toBe(true);
  });

  it("should enhance class with expected exceptions array", () => {
    const metadata = Reflect.getMetadata(FILTER_CATCH_EXCEPTIONS, Test);
    expect(metadata).toEqual(exceptions);
  });
});