import { expect } from "chai";

import { Reflector } from "@venok/core";

import { METHOD_METADATA, PATH_METADATA } from "@venok/http/constants";
import { RequestMethod } from "@venok/http/enums";
import { Sse } from "@venok/http";

describe("@Sse", () => {
  const prefix = "/prefix";
  class Test {
    @Sse(prefix)
    public static test() {}
  }

  it("should enhance method with expected http status code", () => {
    const path = Reflector.reflector.get<string>(PATH_METADATA, Test.test);
    expect(path).to.be.eql("/prefix");

    const method = Reflector.reflector.get<RequestMethod>(METHOD_METADATA, Test.test);
    expect(method).to.be.eql(RequestMethod.GET);

    const metadata = Reflector.reflector.has(Sse, Test.test);
    expect(metadata).to.be.eql(true);
  });
});
