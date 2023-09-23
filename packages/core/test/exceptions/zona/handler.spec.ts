import * as sinon from "sinon";
import { expect } from "chai";
import { ExceptionHandler } from "@venok/core/exceptions/zone/handler";
import { RuntimeException } from "@venok/core/errors/exceptions";

describe("ExceptionHandler", () => {
  let instance: ExceptionHandler;
  beforeEach(() => {
    instance = new ExceptionHandler();
  });
  describe("handle", () => {
    let logger;
    let errorSpy: sinon.SinonSpy;
    beforeEach(() => {
      logger = {
        error: () => {},
      };
      (ExceptionHandler as any).logger = logger;
      errorSpy = sinon.spy(logger, "error");
    });
    it("when exception is instanceof RuntimeException", () => {
      const exception = new RuntimeException("msg");
      instance.handle(exception);
      expect(errorSpy.calledWith(exception.message, exception.stack)).to.be.true;
    });
  });
});
