import { expect } from "chai";
import sinon from "sinon";
import { NoopHttpAdapter } from "@venok/http/helpers/adapter.helper";
import { HttpProxy } from "@venok/http/exceptions/proxy";
import { HttpExceptionsHandler } from "@venok/http/exceptions/handler";
import { ExecutionContextHost } from "@venok/core/context/execution-host";
import { HttpException } from "../../errors";

describe("RouterProxy", () => {
  let routerProxy: HttpProxy;
  let handler: HttpExceptionsHandler;
  const httpException = new HttpException("test", 500);
  let nextStub: sinon.SinonStub;
  beforeEach(() => {
    handler = new HttpExceptionsHandler(new NoopHttpAdapter({}));
    nextStub = sinon.stub(handler, "next");
    routerProxy = new HttpProxy();
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
      const proxy = routerProxy.createExceptionLayerProxy(() => {}, handler);
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
