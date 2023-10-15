import { expect } from "chai";
import { of } from "rxjs";
import sinon from "sinon";
import { FileInterceptor } from "../../../multer";
import { CallHandler } from "@venok/core";
import { ExecutionContextHost } from "@venok/core/context";

describe("FileInterceptor", () => {
  it("should return metatype with expected structure", async () => {
    const targetClass = FileInterceptor("file");
    expect(targetClass.prototype.intercept).to.not.be.undefined;
  });
  describe("intercept", () => {
    let handler: CallHandler;
    beforeEach(() => {
      handler = {
        handle: () => of("test"),
      };
    });
    it("should call single() with expected params", async () => {
      const fieldName = "file";
      const target = new (FileInterceptor(fieldName))();
      const callback = (req: any, res: any, next: any) => next();
      const singleSpy = sinon.stub((target as any).multer, "single").returns(callback);

      await target.intercept(new ExecutionContextHost([]), handler);

      expect(singleSpy.called).to.be.true;
      expect(singleSpy.calledWith(fieldName)).to.be.true;
    });
    it("should transform exception", async () => {
      const fieldName = "file";
      const target = new (FileInterceptor(fieldName))();
      const err = {};
      const callback = (req: any, res: any, next: any) => next(err);
      (target as any).multer = {
        single: () => callback,
      };
      (target.intercept(new ExecutionContextHost([]), handler) as any).catch(
        (error: any) => expect(error).to.not.be.undefined,
      );
    });
  });
});
