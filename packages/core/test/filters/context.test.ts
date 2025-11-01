import { beforeEach, describe, expect, it, spyOn, mock } from "bun:test";
import { ApplicationConfig } from "~/application/config.js";
import { VenokExceptionFilterContext } from "~/filters/context.js";
import { VenokContainer } from "~/injector/container.js";
import { Catch } from "~/decorators/catch.decorator.js";
import { UseFilters } from "~/decorators/exception-filters.decorator.js";

describe("ExternalExceptionFilterContext", () => {
  let applicationConfig: ApplicationConfig;
  let exceptionFilter: VenokExceptionFilterContext;

  class CustomException {}
  @Catch(CustomException)
  class ExceptionFilter implements ExceptionFilter {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public catch(exc: any, res: any) {}
  }
  class ClassWithNoMetadata implements ExceptionFilter {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public catch(exc: any, res: any) {}
  }

  beforeEach(() => {
    applicationConfig = new ApplicationConfig();
    exceptionFilter = new VenokExceptionFilterContext(
      new VenokContainer(),
      applicationConfig
    );
  });
  describe("create", () => {
    describe("when filters metadata is empty", () => {
      class EmptyMetadata {}
      beforeEach(() => {
        spyOn(exceptionFilter, "createContext").mockReturnValue([]);
      });
      it("should return plain ExceptionHandler object", () => {
        const filter = exceptionFilter.create(
          new EmptyMetadata(),
          () => ({}) as any,
          undefined!
        );
        expect((filter as any).filters).toHaveLength(0);
      });
    });
    describe("when filters metadata is not empty", () => {
      @UseFilters(new ExceptionFilter())
      class WithMetadata {}

      it("should return ExceptionHandler object with exception filters", () => {
        const filter = exceptionFilter.create(
          new WithMetadata(),
          () => ({}) as any,
          undefined!
        );
        expect((filter as any).filters.length).toBeGreaterThan(0);
      });
    });
  });
  describe("reflectCatchExceptions", () => {
    it("should return FILTER_CATCH_EXCEPTIONS metadata", () => {
      expect(
        exceptionFilter.reflectCatchExceptions(new ExceptionFilter())
      ).toEqual([CustomException]);
    });
    it("should return an empty array when metadata was found", () => {
      expect(
        exceptionFilter.reflectCatchExceptions(new ClassWithNoMetadata())
      ).toEqual([]);
    });
  });
  describe("createConcreteContext", () => {
    class InvalidFilter {}
    const filters = [new ExceptionFilter(), new InvalidFilter(), "test"];

    it("should return expected exception filters metadata", () => {
      const resolved = exceptionFilter.createConcreteContext(filters as any);
      expect(resolved).toHaveLength(1);
      expect(resolved[0].exceptionMetatypes).toEqual([CustomException]);
      expect(typeof resolved[0].func).toBe("function");
    });
  });

  describe("getGlobalMetadata", () => {
    describe("when contextId is static and inquirerId is nil", () => {
      it("should return global filters", () => {
        const expectedResult = applicationConfig.getGlobalFilters();
        expect(exceptionFilter.getGlobalMetadata()).toBe(expectedResult);
      });
    });
    describe("otherwise", () => {
      it("should merge static global with request/transient scoped filters", () => {
        const globalFilters: any = ["test"];
        const instanceWrapper = {
          getInstanceByContextId: mock(() => ({ instance: "request-scoped" })),
        };
        const instance = "request-scoped";
        const scopedFilterWrappers = [instanceWrapper];

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        spyOn(applicationConfig, "getGlobalFilters").mockReturnValue(globalFilters);
        // @ts-expect-error Mismatch types
        spyOn(applicationConfig, "getGlobalRequestFilters").mockReturnValue(scopedFilterWrappers);

        expect(exceptionFilter.getGlobalMetadata({ id: 3 })).toContain(instance);
        expect(exceptionFilter.getGlobalMetadata({ id: 3 })).toEqual(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          expect.arrayContaining([instance, ...globalFilters])
        );
      });
    });
  });
});