import { beforeEach, describe, expect, it, spyOn, mock } from "bun:test";
import { VenokContainer } from "~/injector/container.js";
import { ExceptionFilterContextCreator } from "~/filters/context-creator.js";
import { FILTER_CATCH_EXCEPTIONS } from "~/constants.js";

export class Filter {}

export class TestFilter {
  catch() {}
}

export class FilterWithException {
  catch() {}
}

Reflect.defineMetadata(FILTER_CATCH_EXCEPTIONS, [Error, TypeError], FilterWithException);

describe("ExceptionFilterContextCreator", () => {
  let filter: ExceptionFilterContextCreator;
  let container: VenokContainer;

  beforeEach(() => {
    container = new VenokContainer();
    filter = new ExceptionFilterContextCreator(container);
  });

  describe("getFilterInstance", () => {
    describe("when param is an object", () => {
      it("should return instance", () => {
        const instance = { catch: () => null };
        expect(filter.getFilterInstance(instance)).toEqual(instance);
      });
    });
    describe("when param is a constructor", () => {
      it("should pick instance from container", () => {
        const wrapper = {
          instance: "test",
          getInstanceByContextId: () => wrapper,
        };
        spyOn(filter, "getInstanceByMetatype").mockImplementation(() => wrapper as any);
        // @ts-expect-error Mismatch types
        expect(filter.getFilterInstance(Filter)).toEqual(wrapper.instance);
      });
      it("should return null", () => {
        spyOn(filter, "getInstanceByMetatype").mockImplementation(() => null as any);
        expect(filter.getFilterInstance(Filter)).toEqual(null);
      });
    });
  });

  describe("getInstanceByMetatype", () => {
    describe('when "moduleContext" is nil', () => {
      it("should return undefined", () => {
        (filter as any).moduleContext = undefined;
        // @ts-expect-error Mismatch types
        expect(filter.getInstanceByMetatype(null)).toBeUndefined();
      });
    });
    describe('when "moduleContext" is not nil', () => {
      beforeEach(() => {
        (filter as any).moduleContext = "test";
      });

      describe("and when module exists", () => {
        it("should return undefined", () => {
          spyOn(container.getModules(), "get").mockImplementation(() => undefined);
          // @ts-expect-error Mismatch types
          expect(filter.getInstanceByMetatype(null)).toBeUndefined();
        });
      });

      describe("and when module does not exist", () => {
        it("should return instance", () => {
          const instance = { test: true };
          const module = { injectables: { get: () => instance } };
          spyOn(container.getModules(), "get").mockImplementation(() => module as any);
          // @ts-expect-error Mismatch types
          expect(filter.getInstanceByMetatype(class {})).toEqual(instance);
        });
      });
    });
  });

  describe("createConcreteContext", () => {
    describe("when metadata is empty", () => {
      it("should return empty array", () => {
        expect(filter.createConcreteContext([])).toEqual([]);
        expect(filter.createConcreteContext(null as any)).toEqual([]);
        expect(filter.createConcreteContext(undefined as any)).toEqual([]);
      });
    });

    describe("when metadata contains filters", () => {
      it("should filter out invalid instances and create context", () => {
        const validFilter = { catch: () => {}, name: "TestFilter" };
        const invalidFilter = {};
        const constructorFilter = TestFilter;
        
        spyOn(filter, "getFilterInstance").mockImplementation((filterInstance) => {
          if (filterInstance === validFilter) return validFilter as any;
          if (filterInstance === constructorFilter) return new TestFilter() as any;
          return null;
        });
        
        spyOn(filter, "reflectCatchExceptions").mockReturnValue([Error]);

        const result = filter.createConcreteContext([
          validFilter,
          invalidFilter,
          constructorFilter,
          null,
          undefined,
        ]);

        expect(result).toHaveLength(2);
        expect(result[0]).toHaveProperty("func");
        expect(result[0]).toHaveProperty("exceptionMetatypes");
        expect(result[0].exceptionMetatypes).toEqual([Error]);
      });

      it("should handle filters with no catch method but with name", () => {
        const namedFilter = { name: "NamedFilter" };
        
        spyOn(filter, "getFilterInstance").mockReturnValue(null);

        const result = filter.createConcreteContext([namedFilter]);

        expect(result).toEqual([]);
      });

      it("should bind catch method correctly", () => {
        const mockCatch = mock(() => "test result");
        const validFilter = { catch: mockCatch };
        
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        spyOn(filter, "getFilterInstance").mockReturnValue(validFilter as any);
        spyOn(filter, "reflectCatchExceptions").mockReturnValue([]);

        const result = filter.createConcreteContext([validFilter]);

        expect(result).toHaveLength(1);
        expect(result[0].func()).toBe("test result");
        expect(mockCatch).toHaveBeenCalled();
      });
    });
  });

  describe("reflectCatchExceptions", () => {
    it("should return empty array when no metadata", () => {
      const instance = new TestFilter();
      const result = filter.reflectCatchExceptions(instance);
      expect(result).toEqual([]);
    });

    it("should return exception types from metadata", () => {
      const instance = new FilterWithException();
      const result = filter.reflectCatchExceptions(instance);
      expect(result).toEqual([Error, TypeError]);
    });

    it("should work with different instance types", () => {
      const CustomError = class extends Error {};
      
      class CustomFilter {
        catch() {}
      }
      
      Reflect.defineMetadata(FILTER_CATCH_EXCEPTIONS, [CustomError], CustomFilter);
      
      const instance = new CustomFilter();
      const result = filter.reflectCatchExceptions(instance);
      expect(result).toEqual([CustomError]);
    });
  });
});
