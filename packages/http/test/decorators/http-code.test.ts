/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, expect, it } from "bun:test";
import { HttpCode } from "~/decorators/http-code.decorator.js";
import { HttpStatus } from "~/enums/status.enum.js";

describe("@HttpCode", () => {
  it("should enhance method with http status code metadata", () => {
    class TestController {
      @HttpCode(201)
      test() {}
    }

    const statusCode = Reflect.getMetadata(HttpCode.KEY, TestController.prototype.test);
    
    expect(statusCode).toBe(201);
  });

  it("should handle HttpStatus enum values", () => {
    class TestController {
      @HttpCode(HttpStatus.CREATED)
      test() {}
    }

    const statusCode = Reflect.getMetadata(HttpCode.KEY, TestController.prototype.test);
    
    expect(statusCode).toBe(HttpStatus.CREATED);
    expect(statusCode).toBe(201);
  });

  it("should handle common HTTP status codes", () => {
    class TestController {
      @HttpCode(HttpStatus.OK)
      getMethod() {}

      @HttpCode(HttpStatus.CREATED)
      postMethod() {}

      @HttpCode(HttpStatus.NO_CONTENT)
      deleteMethod() {}

      @HttpCode(HttpStatus.ACCEPTED)
      patchMethod() {}
    }

    expect(Reflect.getMetadata(HttpCode.KEY, TestController.prototype.getMethod)).toBe(200);
    expect(Reflect.getMetadata(HttpCode.KEY, TestController.prototype.postMethod)).toBe(201);
    expect(Reflect.getMetadata(HttpCode.KEY, TestController.prototype.deleteMethod)).toBe(204);
    expect(Reflect.getMetadata(HttpCode.KEY, TestController.prototype.patchMethod)).toBe(202);
  });

  it("should handle error status codes", () => {
    class TestController {
      @HttpCode(HttpStatus.BAD_REQUEST)
      badRequestMethod() {}

      @HttpCode(HttpStatus.UNAUTHORIZED)
      unauthorizedMethod() {}

      @HttpCode(HttpStatus.FORBIDDEN)
      forbiddenMethod() {}

      @HttpCode(HttpStatus.NOT_FOUND)
      notFoundMethod() {}

      @HttpCode(HttpStatus.INTERNAL_SERVER_ERROR)
      serverErrorMethod() {}
    }

    expect(Reflect.getMetadata(HttpCode.KEY, TestController.prototype.badRequestMethod)).toBe(400);
    expect(Reflect.getMetadata(HttpCode.KEY, TestController.prototype.unauthorizedMethod)).toBe(401);
    expect(Reflect.getMetadata(HttpCode.KEY, TestController.prototype.forbiddenMethod)).toBe(403);
    expect(Reflect.getMetadata(HttpCode.KEY, TestController.prototype.notFoundMethod)).toBe(404);
    expect(Reflect.getMetadata(HttpCode.KEY, TestController.prototype.serverErrorMethod)).toBe(500);
  });

  it("should preserve original method functionality", () => {
    class TestController {
      @HttpCode(201)
      test() {
        return "test result";
      }
    }

    const controller = new TestController();
    expect(controller.test()).toBe("test result");
  });

  it("should work with async methods", () => {
    class TestController {
      @HttpCode(202)
      async test() {
        return Promise.resolve("async result");
      }
    }

    const statusCode = Reflect.getMetadata(HttpCode.KEY, TestController.prototype.test);
    expect(statusCode).toBe(202);
    
    const controller = new TestController();
    expect(controller.test()).toBeInstanceOf(Promise);
  });

  it("should work with methods that have parameters", () => {
    class TestController {
      @HttpCode(200)
      test(param1: string, param2: number) {
        return `${param1}-${param2}`;
      }
    }

    const statusCode = Reflect.getMetadata(HttpCode.KEY, TestController.prototype.test);
    expect(statusCode).toBe(200);
    
    const controller = new TestController();
    expect(controller.test("hello", 123)).toBe("hello-123");
  });

  it("should handle different methods with different status codes", () => {
    class TestController {
      @HttpCode(200)
      method1() {}

      @HttpCode(201)
      method2() {}

      @HttpCode(204)
      method3() {}
    }

    expect(Reflect.getMetadata(HttpCode.KEY, TestController.prototype.method1)).toBe(200);
    expect(Reflect.getMetadata(HttpCode.KEY, TestController.prototype.method2)).toBe(201);
    expect(Reflect.getMetadata(HttpCode.KEY, TestController.prototype.method3)).toBe(204);
  });

  it("should handle custom status codes", () => {
    class TestController {
      @HttpCode(299)
      customSuccessMethod() {}

      @HttpCode(450)
      customErrorMethod() {}
    }

    expect(Reflect.getMetadata(HttpCode.KEY, TestController.prototype.customSuccessMethod)).toBe(299);
    expect(Reflect.getMetadata(HttpCode.KEY, TestController.prototype.customErrorMethod)).toBe(450);
  });

  it("should handle redirect status codes", () => {
    class TestController {
      @HttpCode(HttpStatus.MOVED_PERMANENTLY)
      redirectPermanent() {}

      @HttpCode(HttpStatus.FOUND)
      redirectTemporary() {}

      @HttpCode(HttpStatus.TEMPORARY_REDIRECT)
      redirectTemporaryModern() {}
    }

    expect(Reflect.getMetadata(HttpCode.KEY, TestController.prototype.redirectPermanent)).toBe(301);
    expect(Reflect.getMetadata(HttpCode.KEY, TestController.prototype.redirectTemporary)).toBe(302);
    expect(Reflect.getMetadata(HttpCode.KEY, TestController.prototype.redirectTemporaryModern)).toBe(307);
  });

  it("should have KEY property", () => {
    expect(HttpCode.KEY).toBeDefined();
    expect(typeof HttpCode.KEY).toBe("string");
  });

  it("should only apply to methods, not classes", () => {
    class TestController {
      @HttpCode(201)
      test() {}
    }

    const classMetadata = Reflect.getMetadata(HttpCode.KEY, TestController);
    expect(classMetadata).toBeUndefined();
    
    const methodMetadata = Reflect.getMetadata(HttpCode.KEY, TestController.prototype.test);
    expect(methodMetadata).toBe(201);
  });
});