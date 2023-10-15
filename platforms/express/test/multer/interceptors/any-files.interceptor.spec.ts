import { expect } from "chai";
import { of } from "rxjs";
import sinon from "sinon";
import { AnyFilesInterceptor } from "../../../multer";
import { CallHandler } from "@venok/core";
import { ExecutionContextHost } from "@venok/core/context";

describe("FilesInterceptor", () => {
  it("should return metatype with expected structure", async () => {
    const targetClass = AnyFilesInterceptor();
    expect(targetClass.prototype.intercept).to.not.be.undefined;
  });
  describe("intercept", () => {
    let handler: CallHandler;
    beforeEach(() => {
      handler = {
        handle: () => of("test"),
      };
    });
    it("should call any() with expected params", async () => {
      const target = new (AnyFilesInterceptor())();

      const callback = (req: any, res: any, next: any) => next();
      const arraySpy = sinon.stub((target as any).multer, "any").returns(callback);

      await target.intercept(new ExecutionContextHost([]), handler);

      expect(arraySpy.called).to.be.true;
      expect(arraySpy.calledWith()).to.be.true;
    });
    it("should transform exception", async () => {
      const target = new (AnyFilesInterceptor())();
      const err = {};
      const callback = (req: any, res: any, next: any) => next(err);
      (target as any).multer = {
        any: () => callback,
      };
      (target.intercept(new ExecutionContextHost([]), handler) as any).catch(
        (error: any) => expect(error).to.not.be.undefined,
      );
    });
  });
});
