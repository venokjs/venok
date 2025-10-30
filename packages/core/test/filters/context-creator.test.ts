import { beforeEach, describe, expect, it, spyOn, mock } from "bun:test";
import { VenokContainer } from "~/injector/container.js";
import { ExceptionFilterContextCreator } from "~/filters/context-creator.js";

export class Filter {}

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
});
