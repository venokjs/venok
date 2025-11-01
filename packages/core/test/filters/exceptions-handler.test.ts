import { beforeEach, describe, expect, it, spyOn, mock } from "bun:test";
import { of } from "rxjs";
import { VenokExceptionsHandler } from "~/exceptions/handler.js";
import { VenokExceptionFilter } from "~/filters/filter.js";

describe("ExternalExceptionsHandler", () => {
  let handler: VenokExceptionsHandler;

  beforeEach(() => {
    handler = new VenokExceptionsHandler(new VenokExceptionFilter());

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore The 'logger' property is private, but we want to avoid showing useless error logs
    VenokExceptionFilter.logger.error = () => {};
  });

  describe("next", () => {
    it("should method returns expected stream with message when exception is unknown", () => {
      const error = new Error();
      expect(() => handler.next(error, null!)).toThrow(error);
    });
    describe('when "invokeCustomFilters" returns value', () => {
      const observable$ = of(true);
      beforeEach(() => {
        // @ts-expect-error Mismatch types
        spyOn(handler, "invokeCustomFilters").mockReturnValue(observable$);
      });
      it("should return observable", () => {
        const result = handler.next(new Error(), null!);
        expect(result).toEqual(observable$);
      });
    });
  });
  describe("setCustomFilters", () => {
    const filters = ["test", "test2"];
    it("should set custom filters", () => {
      // @ts-expect-error Mismatch types
      handler.setCustomFilters(filters);
      expect((handler as any).filters).toEqual(filters);
    });
    it("should throw exception when passed argument is not an array", () => {
      expect(() => handler.setCustomFilters(null!)).toThrow();
    });
  });
  describe("invokeCustomFilters", () => {
    describe("when filters array is empty", () => {
      it("should return identity", () => {
        expect(handler.invokeCustomFilters(null, null!)).toBeFalse();
      });
    });
    describe("when filters array is not empty", () => {
      // @ts-expect-error Mismatch types
      let filters, funcSpy;
      class TestException {}
      class AnotherTestException {}

      beforeEach(() => {
        funcSpy = mock();
      });
      describe("when filter exists in filters array", () => {
        beforeEach(() => {
          // @ts-expect-error Mismatch types
          filters = [{ exceptionMetatypes: [TestException], func: funcSpy }];
          (handler as any).filters = filters;
        });
        it("should call funcSpy", async () => {
          await handler.invokeCustomFilters(new TestException(), null!);
          // @ts-expect-error Mismatch types
          expect(funcSpy).toHaveBeenCalled();
        });
        it("should call funcSpy with exception and response passed as an arguments", async () => {
          const exception = new TestException();
          await handler.invokeCustomFilters(exception, null!);
          // @ts-expect-error Mismatch types
          expect(funcSpy).toHaveBeenCalledWith(exception, null!);
        });
        it("should return stream", () => {
          expect(handler.invokeCustomFilters(new TestException(), null!)).not.toBeNull();
        });
      });
      describe("when filter does not exists in filters array", () => {
        beforeEach(() => {
          // @ts-expect-error Mismatch types
          filters = [{ exceptionMetatypes: [AnotherTestException], func: funcSpy }];
          (handler as any).filters = filters;
        });
        it("should not call funcSpy", async () => {
          await handler.invokeCustomFilters(new TestException(), null!);
          // @ts-expect-error Mismatch types
          expect(funcSpy).not.toHaveBeenCalled();
        });
        it("should return null", () => {
          expect(handler.invokeCustomFilters(new TestException(), null!)).toBeFalse();
        });
      });
    });
  });
});