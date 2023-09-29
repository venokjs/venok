import { expect } from "chai";
import { HttpStatus } from "@venok/http/enums";
import { Redirect } from "@venok/http/decorators";
import { REDIRECT_METADATA } from "@venok/http/constants";

describe("@Redirect", () => {
  const url = "https://test.com";
  const statusCode = HttpStatus.FOUND;

  class Test {
    @Redirect(url, statusCode)
    public static test() {}
  }

  it("should enhance method with expected redirect url string", () => {
    const metadata = Reflect.getMetadata(REDIRECT_METADATA, Test.test);
    expect(metadata.url).to.be.eql(url);
  });

  it("should enhance method with expected response code", () => {
    const metadata = Reflect.getMetadata(REDIRECT_METADATA, Test.test);
    expect(metadata.statusCode).to.be.eql(statusCode);
  });
});
