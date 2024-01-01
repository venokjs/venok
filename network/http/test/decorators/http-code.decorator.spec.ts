import { expect } from "chai";

import { Reflector } from "@venok/core";
import { HttpCode } from "@venok/http";

describe("@HttpCode", () => {
  const httpCode = 200;
  class Test {
    @HttpCode(httpCode)
    public static test() {}
  }

  it("should enhance method with expected http status code", () => {
    const metadata = Reflector.reflector.get(HttpCode, Test.test);
    expect(metadata).to.be.eql(httpCode);
  });
});
