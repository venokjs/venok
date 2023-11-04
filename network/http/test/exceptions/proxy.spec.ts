import { expect } from "chai";
import sinon from "sinon";
import { NoopHttpAdapter } from "../../helpers/adapter.helper";
import { ExecutionContextHost } from "@venok/core/context/execution-host";
import { HttpException } from "../../errors";
import { HttpExceptionFilter } from "../../filters/filter";
import { VenokProxy } from "@venok/core/context";
import { VenokExceptionsHandler } from "@venok/core/exceptions/handler";

describe("RouterProxy", () => {
  let routerProxy: VenokProxy;
  let handler: VenokExceptionsHandler;
  const httpException = new HttpException("test", 500);
  let nextStub: sinon.SinonStub;
  beforeEach(() => {
    handler = new VenokExceptionsHandler(new HttpExceptionFilter(new NoopHttpAdapter({})));
    nextStub = sinon.stub(handler, "next");
    routerProxy = new VenokProxy();
  });

  describe("createProxy", () => {
    it("should method return thunk", () => {
      const proxy = routerProxy.createProxy(() => {}, handler);
      expect(typeof proxy === "function").to.be.true;
    });

    it("should method encapsulate callback passed as argument", () => {
      const proxy = routerProxy.createProxy((req, res, next) => {
        throw httpException;
      }, handler);
      proxy(null, null, null as any);

      expect(nextStub.calledOnce).to.be.true;
      expect(nextStub.calledWith(httpException, new ExecutionContextHost([null, null, null]))).to.be.true;
    });

    it("should method encapsulate async callback passed as argument", (done) => {
      const proxy = routerProxy.createProxy(async (req, res, next) => {
        throw httpException;
      }, handler);
      proxy(null, null, null as any);

      setTimeout(() => {
        expect(nextStub.calledOnce).to.be.true;
        expect(nextStub.calledWith(httpException, new ExecutionContextHost([null, null, null]))).to.be.true;
        done();
      }, 0);
    });
  });

  describe("createExceptionLayerProxy", () => {
    it("should method return thunk", () => {
      const proxy = routerProxy.createProxy(() => {}, handler);
      expect(typeof proxy === "function").to.be.true;
    });

    it("should method encapsulate callback passed as argument", () => {
      const proxy = routerProxy.createExceptionLayerProxy((err, req, res, next) => {
        throw httpException;
      }, handler);
      proxy(null, null, null, null as any);

      expect(nextStub.calledOnce).to.be.true;
      expect(nextStub.calledWith(httpException, new ExecutionContextHost([null, null, null]))).to.be.true;
    });

    it("should method encapsulate async callback passed as argument", (done) => {
      const proxy = routerProxy.createExceptionLayerProxy(async (err, req, res, next) => {
        throw httpException;
      }, handler);
      proxy(null, null, null, null as any);

      setTimeout(() => {
        expect(nextStub.calledOnce).to.be.true;
        expect(nextStub.calledWith(httpException, new ExecutionContextHost([null, null, null]))).to.be.true;
        done();
      }, 0);
    });
  });
});
