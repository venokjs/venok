import { expect } from "chai";
import { of } from "rxjs";
import sinon from "sinon";
import { NoFilesInterceptor } from "../../../multer";
import { CallHandler } from "@venok/core";
import { ExecutionContextHost } from "@venok/core/context";

describe("NoFilesInterceptor", () => {
  it("should return metatype with expected structure", async () => {
    const targetClass = NoFilesInterceptor();
    expect(targetClass.prototype.intercept).to.not.be.undefined;
  });
  describe("intercept", () => {
    let handler: CallHandler;
    beforeEach(() => {
      handler = {
        handle: () => of("test"),
      };
    });
    it("should call none() with expected params", async () => {
      const target = new (NoFilesInterceptor())();

      const callback = (req: any, res: any, next: any) => next();
      const noneSpy = sinon.stub((target as any).multer, "none").returns(callback);

      await target.intercept(new ExecutionContextHost([]), handler);

      expect(noneSpy.called).to.be.true;
    });
    it("should transform exception", async () => {
      const target = new (NoFilesInterceptor())();
      const err = {};
      const callback = (req: any, res: any, next: any) => next(err);
      (target as any).multer = {
        none: () => callback,
      };
      (target.intercept(new ExecutionContextHost([]), handler) as any).catch(
        (error: any) => expect(error).to.not.be.undefined,
      );
    });
  });
});
