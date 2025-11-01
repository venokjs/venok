import { beforeEach, describe, expect, it, spyOn, mock } from "bun:test";

import { VenokExceptionsHandler } from "~/exceptions/handler.js";
import { VenokProxy } from "~/context/proxy.js";
import { VenokExceptionFilter } from "~/filters/filter.js";


describe("VenokProxy", () => {
  let venokProxy: VenokProxy;
  let handler: VenokExceptionsHandler;
  let nextSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    handler = new VenokExceptionsHandler(new VenokExceptionFilter());
    nextSpy = spyOn(handler, "next").mockImplementation(() => {});
    venokProxy = new VenokProxy();
    nextSpy.mockClear();
  });

  describe("createProxy", () => {
    it("should method return thunk", () => {
      const proxy = venokProxy.createProxy(() => {}, handler);
      expect(typeof proxy).toBe("function");
    });

    it("should method encapsulate callback passed as argument", async () => {
      const proxy = venokProxy.createProxy((req, res, next) => {
        throw "test";
      }, handler);
      await proxy(null, null, null);
      expect(nextSpy).toHaveBeenCalled();
    });

    it("should method encapsulate async callback passed as argument", async () => {
      const proxy = venokProxy.createProxy(async (req, res, next) => {
        throw "test";
      }, handler);

      await proxy(null, null, null);

      expect(nextSpy).toHaveBeenCalledTimes(1);
    });
  });
});