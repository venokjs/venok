import { expect } from "chai";

import { Reflector } from "@venok/core";
import { RequestMapping, RequestMethod } from "@venok/http";

describe("@RequestMapping", () => {
  const requestProps = {
    path: "test",
    method: RequestMethod.ALL,
  };

  const requestPropsUsingArray = {
    path: ["foo", "bar"],
    method: RequestMethod.ALL,
  };

  it("should enhance class with expected request metadata", () => {
    class Test {
      @RequestMapping(requestProps)
      public static test() {}

      @RequestMapping(requestPropsUsingArray)
      public static testUsingArray() {}
    }

    const path = Reflector.reflector.get<string>("path", Test.test);
    const method = Reflector.reflector.get<string>("method", Test.test);
    const pathUsingArray = Reflector.reflector.get<string>("path", Test.testUsingArray);
    const methodUsingArray = Reflector.reflector.get<string>("method", Test.testUsingArray);

    expect(path).to.be.eql(requestProps.path);
    expect(method).to.be.eql(requestProps.method);
    expect(pathUsingArray).to.be.eql(requestPropsUsingArray.path);
    expect(methodUsingArray).to.be.eql(requestPropsUsingArray.method);
  });

  it("should set request method on GET by default", () => {
    class Test {
      @RequestMapping({ path: "" })
      public static test() {}
    }

    const method = Reflector.reflector.get<string>("method", Test.test);

    expect(method).to.be.eql(RequestMethod.GET);
  });

  it('should set path on "/" by default', () => {
    class Test {
      @RequestMapping({})
      public static test() {}

      @RequestMapping({ path: [] })
      public static testUsingArray() {}
    }

    const path = Reflector.reflector.get<string>("path", Test.test);
    const pathUsingArray = Reflector.reflector.get<string>("path", Test.testUsingArray);

    expect(path).to.be.eql("/");
    expect(pathUsingArray).to.be.eql("/");
  });
});
