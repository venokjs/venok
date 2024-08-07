import { expect } from "chai";

import { Reflector } from "@venok/core";
import { All, Body, Delete, Get, HostParam, Param, Patch, Post, Put, Query, RequestMethod, Search } from "@venok/http";

describe("@Get", () => {
  const requestPath = "test";
  const requestProps = {
    path: requestPath,
    method: RequestMethod.GET,
  };

  const requestPathUsingArray = ["foo", "bar"];
  const requestPropsUsingArray = {
    path: requestPathUsingArray,
    method: RequestMethod.GET,
  };

  it("should enhance class with expected request metadata", () => {
    class Test {
      @Get(requestPath)
      public static test(@Param("id") params: any) {}

      @Get(requestPathUsingArray)
      public static testUsingArray(@Param("id") params: any) {}
    }

    const path = Reflector.reflector.get<string>("path", Test.test);
    const method = Reflector.reflector.get<string>("method", Test.test);
    const pathUsingArray = Reflector.reflector.get<string>("path", Test.testUsingArray);
    const methodUsingArray = Reflector.reflector.get<string>("method", Test.testUsingArray);

    expect(path).to.be.eql(requestPath);
    expect(method).to.be.eql(requestProps.method);
    expect(pathUsingArray).to.be.eql(requestPathUsingArray);
    expect(methodUsingArray).to.be.eql(requestPropsUsingArray.method);
  });

  it('should set path on "/" by default', () => {
    class Test {
      @Get()
      public static test() {}

      @Get([])
      public static testUsingArray() {}
    }

    const path = Reflector.reflector.get<string>("path", Test.test);
    const pathUsingArray = Reflector.reflector.get<string>("path", Test.testUsingArray);

    expect(path).to.be.eql("/");
    expect(pathUsingArray).to.be.eql("/");
  });
});

describe("@Post", () => {
  const requestPath = "test";
  const requestProps = {
    path: requestPath,
    method: RequestMethod.POST,
  };

  const requestPathUsingArray = ["foo", "bar"];
  const requestPropsUsingArray = {
    path: requestPathUsingArray,
    method: RequestMethod.POST,
  };

  it("should enhance class with expected request metadata", () => {
    class Test {
      @Post(requestPath)
      public static test() {}

      @Post(requestPathUsingArray)
      public static testUsingArray() {}
    }

    const path = Reflector.reflector.get<string>("path", Test.test);
    const method = Reflector.reflector.get<string>("method", Test.test);
    const pathUsingArray = Reflector.reflector.get<string>("path", Test.testUsingArray);
    const methodUsingArray = Reflector.reflector.get<string>("method", Test.testUsingArray);

    expect(path).to.be.eql(requestPath);
    expect(method).to.be.eql(requestProps.method);
    expect(pathUsingArray).to.be.eql(requestPathUsingArray);
    expect(methodUsingArray).to.be.eql(requestPropsUsingArray.method);
  });

  it('should set path on "/" by default', () => {
    class Test {
      @Post()
      public static test(@Query() query: any, @Param() params: any, @HostParam() hostParams: any) {}

      @Post([])
      public static testUsingArray(@Query() query: any, @Param() params: any, @HostParam() hostParams: any) {}
    }

    const path = Reflector.reflector.get<string>("path", Test.test);
    const pathUsingArray = Reflector.reflector.get<string>("path", Test.testUsingArray);

    expect(path).to.be.eql("/");
    expect(pathUsingArray).to.be.eql("/");
  });
});

describe("@Delete", () => {
  const requestPath = "test";
  const requestProps = {
    path: requestPath,
    method: RequestMethod.DELETE,
  };

  const requestPathUsingArray = ["foo", "bar"];
  const requestPropsUsingArray = {
    path: requestPathUsingArray,
    method: RequestMethod.DELETE,
  };

  it("should enhance class with expected request metadata", () => {
    class Test {
      @Delete(requestPath)
      public static test(@Body() body: any) {}

      @Delete(requestPathUsingArray)
      public static testUsingArray(@Body() body: any) {}
    }

    const path = Reflector.reflector.get<string>("path", Test.test);
    const method = Reflector.reflector.get<string>("method", Test.test);
    const pathUsingArray = Reflector.reflector.get<string>("path", Test.testUsingArray);
    const methodUsingArray = Reflector.reflector.get<string>("method", Test.testUsingArray);

    expect(path).to.be.eql(requestPath);
    expect(method).to.be.eql(requestProps.method);
    expect(pathUsingArray).to.be.eql(requestPathUsingArray);
    expect(methodUsingArray).to.be.eql(requestPropsUsingArray.method);
  });

  it('should set path on "/" by default', () => {
    class Test {
      @Delete()
      public static test() {}

      @Delete([])
      public static testUsingArray() {}
    }

    const path = Reflector.reflector.get<string>("path", Test.test);
    const pathUsingArray = Reflector.reflector.get<string>("path", Test.testUsingArray);

    expect(path).to.be.eql("/");
    expect(pathUsingArray).to.be.eql("/");
  });
});

describe("@All", () => {
  const requestPath = "test";
  const requestProps = {
    path: requestPath,
    method: RequestMethod.ALL,
  };

  const requestPathUsingArray = ["foo", "bar"];
  const requestPropsUsingArray = {
    path: requestPathUsingArray,
    method: RequestMethod.ALL,
  };

  it("should enhance class with expected request metadata", () => {
    class Test {
      @All(requestPath)
      public static test() {}

      @All(requestPathUsingArray)
      public static testUsingArray() {}
    }

    const path = Reflector.reflector.get<string>("path", Test.test);
    const method = Reflector.reflector.get<string>("method", Test.test);
    const pathUsingArray = Reflector.reflector.get<string>("path", Test.testUsingArray);
    const methodUsingArray = Reflector.reflector.get<string>("method", Test.testUsingArray);

    expect(path).to.be.eql(requestPath);
    expect(method).to.be.eql(requestProps.method);
    expect(pathUsingArray).to.be.eql(requestPathUsingArray);
    expect(methodUsingArray).to.be.eql(requestPropsUsingArray.method);
  });

  it('should set path on "/" by default', () => {
    class Test {
      @All()
      public static test() {}

      @All([])
      public static testUsingArray() {}
    }

    const path = Reflector.reflector.get<string>("path", Test.test);
    const pathUsingArray = Reflector.reflector.get<string>("path", Test.testUsingArray);

    expect(path).to.be.eql("/");
    expect(pathUsingArray).to.be.eql("/");
  });
});

describe("@Put", () => {
  const requestPath = "test";
  const requestProps = {
    path: requestPath,
    method: RequestMethod.PUT,
  };

  const requestPathUsingArray = ["foo", "bar"];
  const requestPropsUsingArray = {
    path: requestPathUsingArray,
    method: RequestMethod.PUT,
  };

  it("should enhance class with expected request metadata", () => {
    class Test {
      @Put(requestPath)
      public static test() {}

      @Put(requestPathUsingArray)
      public static testUsingArray() {}
    }

    const path = Reflector.reflector.get<string>("path", Test.test);
    const method = Reflector.reflector.get<string>("method", Test.test);
    const pathUsingArray = Reflector.reflector.get<string>("path", Test.testUsingArray);
    const methodUsingArray = Reflector.reflector.get<string>("method", Test.testUsingArray);

    expect(path).to.be.eql(requestPath);
    expect(method).to.be.eql(requestProps.method);
    expect(pathUsingArray).to.be.eql(requestPathUsingArray);
    expect(methodUsingArray).to.be.eql(requestPropsUsingArray.method);
  });

  it('should set path on "/" by default', () => {
    class Test {
      @Put()
      public static test() {}

      @Put([])
      public static testUsingArray() {}
    }

    const path = Reflector.reflector.get<string>("path", Test.test);
    const pathUsingArray = Reflector.reflector.get<string>("path", Test.testUsingArray);

    expect(path).to.be.eql("/");
    expect(pathUsingArray).to.be.eql("/");
  });
});

describe("@Patch", () => {
  const requestPath = "test";
  const requestProps = {
    path: requestPath,
    method: RequestMethod.PATCH,
  };

  const requestPathUsingArray = ["foo", "bar"];
  const requestPropsUsingArray = {
    path: requestPathUsingArray,
    method: RequestMethod.PATCH,
  };

  it("should enhance class with expected request metadata", () => {
    class Test {
      @Patch(requestPath)
      public static test() {}

      @Patch(requestPathUsingArray)
      public static testUsingArray() {}
    }

    const path = Reflector.reflector.get<string>("path", Test.test);
    const method = Reflector.reflector.get<string>("method", Test.test);
    const pathUsingArray = Reflector.reflector.get<string>("path", Test.testUsingArray);
    const methodUsingArray = Reflector.reflector.get<string>("method", Test.testUsingArray);

    expect(path).to.be.eql(requestPath);
    expect(method).to.be.eql(requestProps.method);
    expect(pathUsingArray).to.be.eql(requestPathUsingArray);
    expect(methodUsingArray).to.be.eql(requestPropsUsingArray.method);
  });

  it('should set path on "/" by default', () => {
    class Test {
      @Patch()
      public static test() {}

      @Patch([])
      public static testUsingArray() {}
    }

    const path = Reflector.reflector.get<string>("path", Test.test);
    const pathUsingArray = Reflector.reflector.get<string>("path", Test.testUsingArray);

    expect(path).to.be.eql("/");
    expect(pathUsingArray).to.be.eql("/");
  });
});

describe("@Search", () => {
  const requestPath = "test";
  const requestProps = {
    path: requestPath,
    method: RequestMethod.SEARCH,
  };

  const requestPathUsingArray = ["foo", "bar"];
  const requestPropsUsingArray = {
    path: requestPathUsingArray,
    method: RequestMethod.SEARCH,
  };

  it("should enhance class with expected request metadata", () => {
    class Test {
      @Search(requestPath)
      public static test() {}

      @Search(requestPathUsingArray)
      public static testUsingArray() {}
    }

    const path = Reflector.reflector.get<string>("path", Test.test);
    const method = Reflector.reflector.get<string>("method", Test.test);
    const pathUsingArray = Reflector.reflector.get<string>("path", Test.testUsingArray);
    const methodUsingArray = Reflector.reflector.get<string>("method", Test.testUsingArray);

    expect(path).to.be.eql(requestPath);
    expect(method).to.be.eql(requestProps.method);
    expect(pathUsingArray).to.be.eql(requestPathUsingArray);
    expect(methodUsingArray).to.be.eql(requestPropsUsingArray.method);
  });

  it('should set path on "/" by default', () => {
    class Test {
      @Search()
      public static test(@Query() query: any, @Param() params: any, @HostParam() hostParams: any) {}

      @Search([])
      public static testUsingArray(@Query() query: any, @Param() params: any, @HostParam() hostParams: any) {}
    }

    const path = Reflector.reflector.get<string>("path", Test.test);
    const pathUsingArray = Reflector.reflector.get<string>("path", Test.testUsingArray);
    expect(path).to.be.eql("/");
    expect(pathUsingArray).to.be.eql("/");
  });
});

describe("Inheritance", () => {
  const requestPath = "test";
  const requestProps = {
    path: requestPath,
    method: RequestMethod.GET,
  };

  const requestPathUsingArray = ["foo", "bar"];
  const requestPropsUsingArray = {
    path: requestPathUsingArray,
    method: RequestMethod.GET,
  };

  it("should enhance subclass with expected request metadata", () => {
    class Parent {
      @Get(requestPath)
      public static test() {}

      @Get(requestPathUsingArray)
      public static testUsingArray() {}
    }

    class Test extends Parent {}

    const path = Reflector.reflector.get<string>("path", Test.test);
    const method = Reflector.reflector.get<string>("method", Test.test);
    const pathUsingArray = Reflector.reflector.get<string>("path", Test.testUsingArray);
    const methodUsingArray = Reflector.reflector.get<string>("method", Test.testUsingArray);

    expect(path).to.be.eql(requestPath);
    expect(method).to.be.eql(requestProps.method);
    expect(pathUsingArray).to.be.eql(requestPathUsingArray);
    expect(methodUsingArray).to.be.eql(requestPropsUsingArray.method);
  });
});
