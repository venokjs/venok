import { expect } from "chai";
import sinon from "sinon";
import { VenokProxy } from "@venok/core/context/proxy";
import { VenokExceptionsHandler } from "@venok/core/exceptions/handler";
import { RuntimeException } from "@venok/core/errors/exceptions";
import { VenokExceptionFilter } from "@venok/core/filters/filter";

describe("VenokProxy", () => {
  let venokProxy: VenokProxy;
  let handlerMock: sinon.SinonMock;
  let handler: VenokExceptionsHandler;

  beforeEach(() => {
    handler = new VenokExceptionsHandler(new VenokExceptionFilter());
    handlerMock = sinon.mock(handler);
    venokProxy = new VenokProxy();
  });

  describe("createProxy", () => {
    it("should method return thunk", () => {
      const proxy = venokProxy.createProxy(() => {}, handler);
      expect(typeof proxy === "function").to.be.true;
    });

    it("should method encapsulate callback passed as argument", () => {
      const expectation = handlerMock.expects("next").once();
      const proxy = venokProxy.createProxy((req, res, next) => {
        throw new RuntimeException("test");
      }, handler);
      proxy(null, null, null);
      expectation.verify();
    });

    it("should method encapsulate async callback passed as argument", (done) => {
      const expectation = handlerMock.expects("next").once();
      const proxy = venokProxy.createProxy(async (req, res, next) => {
        throw new RuntimeException("test");
      }, handler);
      proxy(null, null, null);

      setTimeout(() => {
        expectation.verify();
        done();
      }, 0);
    });
  });
});
