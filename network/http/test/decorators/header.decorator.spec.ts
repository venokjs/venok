import { expect } from "chai";

import { Reflector } from "@venok/core";
import { Header, HEADERS_METADATA } from "@venok/http";

describe("@Header", () => {
  class Test {
    @Header("Content-Type", "Test")
    @Header("Authorization", "JWT")
    public static test() {}
  }

  it("should enhance method with expected template string", () => {
    const metadata = Reflector.reflector.get<{ name: string; value: string }[]>(HEADERS_METADATA, Test.test);
    expect(metadata).to.be.eql([
      { name: "Authorization", value: "JWT" },
      { name: "Content-Type", value: "Test" },
    ]);
  });
});
