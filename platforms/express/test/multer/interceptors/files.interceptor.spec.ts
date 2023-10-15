import { expect } from "chai";
import { of } from "rxjs";
import sinon from "sinon";
import { FilesInterceptor } from "../../../multer";
import { CallHandler } from "@venok/core";
import { ExecutionContextHost } from "@venok/core/context";

describe("FilesInterceptor", () => {
  it("should return metatype with expected structure", async () => {
    const targetClass = FilesInterceptor("file");
    expect(targetClass.prototype.intercept).to.not.be.undefined;
  });
  describe("intercept", () => {
    let handler: CallHandler;
    beforeEach(() => {
      handler = {
        handle: () => of("test"),
      };
    });
    it("should call array() with expected params", async () => {
      const fieldName = "file";
      const maxCount = 10;
      const target = new (FilesInterceptor(fieldName, maxCount))();

      const callback = (req: any, res: any, next: any) => next();
      const arraySpy = sinon.stub((target as any).multer, "array").returns(callback);

      await target.intercept(new ExecutionContextHost([]), handler);

      expect(arraySpy.called).to.be.true;
      expect(arraySpy.calledWith(fieldName, maxCount)).to.be.true;
    });
    it("should transform exception", async () => {
      const fieldName = "file";
      const target = new (FilesInterceptor(fieldName))();
      const err = {};
      const callback = (req: any, res: any, next: any) => next(err);
      (target as any).multer = {
        array: () => callback,
      };
      (target.intercept(new ExecutionContextHost([]), handler) as any).catch(
        (error: any) => expect(error).to.not.be.undefined,
      );
    });
  });
});
