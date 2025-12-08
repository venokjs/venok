 
import { describe, expect, it } from "bun:test";
import { Redirect } from "~/decorators/redirect.decorator.js";
import { REDIRECT_METADATA } from "~/constants.js";

describe("@Redirect", () => {
  it("should enhance method with redirect metadata when only URL provided", () => {
    class TestController {
      @Redirect("https://example.com")
      test() {}
    }

    const redirectOptions = Reflect.getMetadata(REDIRECT_METADATA, TestController.prototype.test);
    
    expect(redirectOptions).toEqual({
      url: "https://example.com",
      statusCode: undefined,
    });
  });

  it("should enhance method with redirect metadata when URL and status code provided", () => {
    class TestController {
      @Redirect("https://example.com", 301)
      test() {}
    }

    const redirectOptions = Reflect.getMetadata(REDIRECT_METADATA, TestController.prototype.test);
    
    expect(redirectOptions).toEqual({
      url: "https://example.com",
      statusCode: 301,
    });
  });

  it("should handle relative URLs", () => {
    class TestController {
      @Redirect("/dashboard")
      test() {}
    }

    const redirectOptions = Reflect.getMetadata(REDIRECT_METADATA, TestController.prototype.test);
    
    expect(redirectOptions).toEqual({
      url: "/dashboard",
      statusCode: undefined,
    });
  });

  it("should handle relative URLs with status code", () => {
    class TestController {
      @Redirect("/login", 302)
      test() {}
    }

    const redirectOptions = Reflect.getMetadata(REDIRECT_METADATA, TestController.prototype.test);
    
    expect(redirectOptions).toEqual({
      url: "/login",
      statusCode: 302,
    });
  });

  it("should handle common redirect status codes", () => {
    class TestController {
      @Redirect("https://example.com", 300)
      multipleChoices() {}

      @Redirect("https://example.com", 301)
      movedPermanently() {}

      @Redirect("https://example.com", 302)
      found() {}

      @Redirect("https://example.com", 303)
      seeOther() {}

      @Redirect("https://example.com", 307)
      temporaryRedirect() {}

      @Redirect("https://example.com", 308)
      permanentRedirect() {}
    }

    expect(Reflect.getMetadata(REDIRECT_METADATA, TestController.prototype.multipleChoices).statusCode).toBe(300);
    expect(Reflect.getMetadata(REDIRECT_METADATA, TestController.prototype.movedPermanently).statusCode).toBe(301);
    expect(Reflect.getMetadata(REDIRECT_METADATA, TestController.prototype.found).statusCode).toBe(302);
    expect(Reflect.getMetadata(REDIRECT_METADATA, TestController.prototype.seeOther).statusCode).toBe(303);
    expect(Reflect.getMetadata(REDIRECT_METADATA, TestController.prototype.temporaryRedirect).statusCode).toBe(307);
    expect(Reflect.getMetadata(REDIRECT_METADATA, TestController.prototype.permanentRedirect).statusCode).toBe(308);
  });

  it("should handle query parameters in URL", () => {
    class TestController {
      @Redirect("https://example.com/search?q=test&type=user", 302)
      test() {}
    }

    const redirectOptions = Reflect.getMetadata(REDIRECT_METADATA, TestController.prototype.test);
    
    expect(redirectOptions).toEqual({
      url: "https://example.com/search?q=test&type=user",
      statusCode: 302,
    });
  });

  it("should handle URL fragments", () => {
    class TestController {
      @Redirect("https://example.com/page#section", 302)
      test() {}
    }

    const redirectOptions = Reflect.getMetadata(REDIRECT_METADATA, TestController.prototype.test);
    
    expect(redirectOptions).toEqual({
      url: "https://example.com/page#section",
      statusCode: 302,
    });
  });

  it("should handle empty path", () => {
    class TestController {
      @Redirect("")
      test() {}
    }

    const redirectOptions = Reflect.getMetadata(REDIRECT_METADATA, TestController.prototype.test);
    
    expect(redirectOptions).toEqual({
      url: "",
      statusCode: undefined,
    });
  });

  it("should handle special characters in URL", () => {
    class TestController {
      @Redirect("https://example.com/path with spaces/file%20name.html")
      test() {}
    }

    const redirectOptions = Reflect.getMetadata(REDIRECT_METADATA, TestController.prototype.test);
    
    expect(redirectOptions).toEqual({
      url: "https://example.com/path with spaces/file%20name.html",
      statusCode: undefined,
    });
  });

  it("should preserve original method functionality", () => {
    class TestController {
      @Redirect("https://example.com")
      test() {
        return "test result";
      }
    }

    const controller = new TestController();
    expect(controller.test()).toBe("test result");
  });

  it("should work with async methods", () => {
    class TestController {
      @Redirect("https://example.com", 302)
      async test() {
        return Promise.resolve("async result");
      }
    }

    const redirectOptions = Reflect.getMetadata(REDIRECT_METADATA, TestController.prototype.test);
    expect(redirectOptions.url).toBe("https://example.com");
    expect(redirectOptions.statusCode).toBe(302);
    
    const controller = new TestController();
    expect(controller.test()).toBeInstanceOf(Promise);
  });

  it("should work with methods that have parameters", () => {
    class TestController {
      @Redirect("/success", 302)
      test(param1: string, param2: number) {
        return `${param1}-${param2}`;
      }
    }

    const redirectOptions = Reflect.getMetadata(REDIRECT_METADATA, TestController.prototype.test);
    expect(redirectOptions.url).toBe("/success");
    expect(redirectOptions.statusCode).toBe(302);
    
    const controller = new TestController();
    expect(controller.test("hello", 123)).toBe("hello-123");
  });

  it("should handle different methods with different redirect options", () => {
    class TestController {
      @Redirect("/login", 302)
      method1() {}

      @Redirect("https://external.com", 301)
      method2() {}

      @Redirect("/dashboard")
      method3() {}
    }

    const redirect1 = Reflect.getMetadata(REDIRECT_METADATA, TestController.prototype.method1);
    const redirect2 = Reflect.getMetadata(REDIRECT_METADATA, TestController.prototype.method2);
    const redirect3 = Reflect.getMetadata(REDIRECT_METADATA, TestController.prototype.method3);
    
    expect(redirect1).toEqual({ url: "/login", statusCode: 302 });
    expect(redirect2).toEqual({ url: "https://external.com", statusCode: 301 });
    expect(redirect3).toEqual({ url: "/dashboard", statusCode: undefined });
  });

  it("should handle protocol-relative URLs", () => {
    class TestController {
      @Redirect("//cdn.example.com/assets", 302)
      test() {}
    }

    const redirectOptions = Reflect.getMetadata(REDIRECT_METADATA, TestController.prototype.test);
    
    expect(redirectOptions).toEqual({
      url: "//cdn.example.com/assets",
      statusCode: 302,
    });
  });

  it("should handle status code 0", () => {
    class TestController {
      @Redirect("https://example.com", 0)
      test() {}
    }

    const redirectOptions = Reflect.getMetadata(REDIRECT_METADATA, TestController.prototype.test);
    
    expect(redirectOptions).toEqual({
      url: "https://example.com",
      statusCode: 0,
    });
  });

  it("should only apply to methods, not classes", () => {
    class TestController {
      @Redirect("/test", 302)
      test() {}
    }

    const classMetadata = Reflect.getMetadata(REDIRECT_METADATA, TestController);
    expect(classMetadata).toBeUndefined();
    
    const methodMetadata = Reflect.getMetadata(REDIRECT_METADATA, TestController.prototype.test);
    expect(methodMetadata).toEqual({ url: "/test", statusCode: 302 });
  });
});