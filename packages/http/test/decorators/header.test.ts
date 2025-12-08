 
import { describe, expect, it } from "bun:test";
import { Header } from "~/decorators/header.decorator.js";
import { HEADERS_METADATA } from "~/constants.js";

describe("@Header", () => {
  it("should enhance method with header metadata", () => {
    class TestController {
      @Header("Cache-Control", "no-cache")
      test() {}
    }

    const headers = Reflect.getMetadata(HEADERS_METADATA, TestController.prototype.test);
    
    expect(headers).toEqual([{ name: "Cache-Control", value: "no-cache" }]);
  });

  it("should handle multiple headers on same method", () => {
    class TestController {
      @Header("Cache-Control", "no-cache")
      @Header("X-Custom-Header", "custom-value")
      test() {}
    }

    const headers = Reflect.getMetadata(HEADERS_METADATA, TestController.prototype.test);
    
    expect(headers).toEqual([
      { name: "X-Custom-Header", value: "custom-value" },
      { name: "Cache-Control", value: "no-cache" },
    ]);
  });

  it("should handle string header name and value", () => {
    class TestController {
      @Header("Content-Type", "application/json")
      test() {}
    }

    const headers = Reflect.getMetadata(HEADERS_METADATA, TestController.prototype.test);
    
    expect(headers).toEqual([{ name: "Content-Type", value: "application/json" }]);
  });

  it("should handle empty string values", () => {
    class TestController {
      @Header("X-Empty-Header", "")
      test() {}
    }

    const headers = Reflect.getMetadata(HEADERS_METADATA, TestController.prototype.test);
    
    expect(headers).toEqual([{ name: "X-Empty-Header", value: "" }]);
  });

  it("should handle special characters in header name and value", () => {
    class TestController {
      @Header("X-Special-Header", "value with spaces and symbols: !@#$%")
      test() {}
    }

    const headers = Reflect.getMetadata(HEADERS_METADATA, TestController.prototype.test);
    
    expect(headers).toEqual([{ name: "X-Special-Header", value: "value with spaces and symbols: !@#$%" }]);
  });

  it("should preserve original method descriptor", () => {
    class TestController {
      @Header("Cache-Control", "no-cache")
      test() {
        return "test result";
      }
    }

    const controller = new TestController();
    expect(controller.test()).toBe("test result");
  });

  it("should work with async methods", () => {
    class TestController {
      @Header("Cache-Control", "no-cache")
      async test() {
        return Promise.resolve("async result");
      }
    }

    const headers = Reflect.getMetadata(HEADERS_METADATA, TestController.prototype.test);
    expect(headers).toEqual([{ name: "Cache-Control", value: "no-cache" }]);
    
    const controller = new TestController();
    expect(controller.test()).toBeInstanceOf(Promise);
  });

  it("should work with methods that have parameters", () => {
    class TestController {
      @Header("Cache-Control", "no-cache")
      test(param1: string, param2: number) {
        return `${param1}-${param2}`;
      }
    }

    const headers = Reflect.getMetadata(HEADERS_METADATA, TestController.prototype.test);
    expect(headers).toEqual([{ name: "Cache-Control", value: "no-cache" }]);
    
    const controller = new TestController();
    expect(controller.test("hello", 123)).toBe("hello-123");
  });

  it("should handle multiple methods with different headers", () => {
    class TestController {
      @Header("Cache-Control", "no-cache")
      method1() {}

      @Header("Content-Type", "application/json")
      method2() {}
    }

    const headers1 = Reflect.getMetadata(HEADERS_METADATA, TestController.prototype.method1);
    const headers2 = Reflect.getMetadata(HEADERS_METADATA, TestController.prototype.method2);
    
    expect(headers1).toEqual([{ name: "Cache-Control", value: "no-cache" }]);
    expect(headers2).toEqual([{ name: "Content-Type", value: "application/json" }]);
  });

  it("should handle common HTTP headers", () => {
    class TestController {
      @Header("Access-Control-Allow-Origin", "*")
      @Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE")
      @Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
      corsEnabledMethod() {}
    }

    const headers = Reflect.getMetadata(HEADERS_METADATA, TestController.prototype.corsEnabledMethod);
    
    expect(headers).toEqual([
      { name: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
      { name: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE" },
      { name: "Access-Control-Allow-Origin", value: "*" },
    ]);
  });
});