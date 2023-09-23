import { expect } from "chai";
import * as sinon from "sinon";
import { BaseExceptionFilterContext } from "@venok/core/exceptions/filter-context";
import { VenokContainer } from "@venok/core/injector/container";

export class Filter {}

describe("BaseExceptionFilterContext", () => {
  let filter: BaseExceptionFilterContext;
  let container: VenokContainer;

  beforeEach(() => {
    container = new VenokContainer();
    filter = new BaseExceptionFilterContext(container);
  });

  describe("getFilterInstance", () => {
    describe("when param is an object", () => {
      it("should return instance", () => {
        const instance = { catch: () => null };
        expect(filter.getFilterInstance(instance)).to.be.eql(instance);
      });
    });
    describe("when param is a constructor", () => {
      it("should pick instance from container", () => {
        const wrapper = {
          instance: "test",
          getInstanceByContextId: () => wrapper,
        };
        sinon.stub(filter, "getInstanceByMetatype").callsFake(() => wrapper as any);
        expect(filter.getFilterInstance(Filter)).to.be.eql(wrapper.instance);
      });
      it("should return null", () => {
        sinon.stub(filter, "getInstanceByMetatype").callsFake(() => null as any);
        expect(filter.getFilterInstance(Filter)).to.be.eql(null);
      });
    });
  });

  describe("getInstanceByMetatype", () => {
    describe('when "moduleContext" is nil', () => {
      it("should return undefined", () => {
        (filter as any).moduleContext = undefined;
        expect(filter.getInstanceByMetatype(null as any)).to.be.undefined;
      });
    });
    describe('when "moduleContext" is not nil', () => {
      beforeEach(() => {
        (filter as any).moduleContext = "test";
      });

      describe("and when module exists", () => {
        it("should return undefined", () => {
          sinon.stub(container.getModules(), "get").callsFake(() => undefined);
          expect(filter.getInstanceByMetatype(null as any)).to.be.undefined;
        });
      });

      describe("and when module does not exist", () => {
        it("should return instance", () => {
          const instance = { test: true };
          const module = { injectables: { get: () => instance } };
          sinon.stub(container.getModules(), "get").callsFake(() => module as any);
          expect(filter.getInstanceByMetatype(class {})).to.be.eql(instance);
        });
      });
    });
  });
});
