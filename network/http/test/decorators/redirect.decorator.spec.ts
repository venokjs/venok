import { expect } from "chai";

import { Reflector } from "@venok/core";
import { HttpStatus, Redirect, REDIRECT_METADATA, RedirectOptions } from "@venok/http";

describe("@Redirect", () => {
  const url = "https://test.com";
  const statusCode = HttpStatus.FOUND;

  class Test {
    @Redirect(url, statusCode)
    public static test() {}
  }

  it("should enhance method with expected redirect url string", () => {
    const metadata = Reflector.reflector.get<RedirectOptions>(REDIRECT_METADATA, Test.test);
    expect(metadata.url).to.be.eql(url);
  });

  it("should enhance method with expected response code", () => {
    const metadata = Reflector.reflector.get<RedirectOptions>(REDIRECT_METADATA, Test.test);
    expect(metadata.statusCode).to.be.eql(statusCode);
  });
});
