import { expect } from "chai";

import { Reflector } from "@venok/core";
import { Render } from "@venok/http";

describe("@Render", () => {
  const template = "template";

  class Test {
    @Render("template")
    public static test() {}
  }

  it("should enhance method with expected template string", () => {
    const metadata = Reflector.reflector.get(Render, Test.test);
    expect(metadata).to.be.eql(template);
  });
});
