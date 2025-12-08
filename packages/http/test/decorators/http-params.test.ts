/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, expect, it } from "bun:test";
import { 
  HttpContext, 
  Ip, 
  Headers, 
  Query, 
  Body, 
  Param, 
  HostParam,
  UploadedFile,
  UploadedFiles,
  MultipleUploadedFiles
} from "~/decorators/http-params.decorator.js";
import { RESPONSE_PASSTHROUGH_METADATA } from "~/constants.js";

describe("HTTP Parameter Decorators", () => {
  describe("@HttpContext", () => {
    it("should work as parameter decorator", () => {
      class TestController {
        test(@HttpContext() context: any) {}
      }

      // Just test that the decorator doesn't throw
      expect(TestController.prototype.test).toBeDefined();
    });

    it("should set response passthrough metadata when passthrough option is true", () => {
      class TestController {
        test(@HttpContext({ response: { passthrough: true } }) context: any) {}
      }

      const passthrough = Reflect.getMetadata(RESPONSE_PASSTHROUGH_METADATA, TestController, "test");
      expect(passthrough).toBe(true);
    });

    it("should not set response passthrough metadata when passthrough option is false", () => {
      class TestController {
        test(@HttpContext({ response: { passthrough: false } }) context: any) {}
      }

      const passthrough = Reflect.getMetadata(RESPONSE_PASSTHROUGH_METADATA, TestController, "test");
      expect(passthrough).toBeUndefined();
    });
  });

  describe("@Ip", () => {
    it("should work as parameter decorator", () => {
      class TestController {
        test(@Ip() ip: string) {}
      }

      expect(TestController.prototype.test).toBeDefined();
    });
  });

  describe("@Headers", () => {
    it("should work as parameter decorator without property", () => {
      class TestController {
        test(@Headers() headers: any) {}
      }

      expect(TestController.prototype.test).toBeDefined();
    });

    it("should work with property parameter", () => {
      class TestController {
        test(@Headers("authorization") auth: string) {}
      }

      expect(TestController.prototype.test).toBeDefined();
    });
  });

  describe("@Query", () => {
    it("should work as parameter decorator without parameters", () => {
      class TestController {
        test(@Query() query: any) {}
      }

      expect(TestController.prototype.test).toBeDefined();
    });

    it("should work with property parameter", () => {
      class TestController {
        test(@Query("search") search: string) {}
      }

      expect(TestController.prototype.test).toBeDefined();
    });
  });

  describe("@Body", () => {
    it("should work as parameter decorator without parameters", () => {
      class TestController {
        test(@Body() body: any) {}
      }

      expect(TestController.prototype.test).toBeDefined();
    });

    it("should work with property parameter", () => {
      class TestController {
        test(@Body("name") name: string) {}
      }

      expect(TestController.prototype.test).toBeDefined();
    });
  });

  describe("@Param", () => {
    it("should work as parameter decorator without parameters", () => {
      class TestController {
        test(@Param() params: any) {}
      }

      expect(TestController.prototype.test).toBeDefined();
    });

    it("should work with property parameter", () => {
      class TestController {
        test(@Param("id") id: string) {}
      }

      expect(TestController.prototype.test).toBeDefined();
    });
  });

  describe("@HostParam", () => {
    it("should work as parameter decorator without parameters", () => {
      class TestController {
        test(@HostParam() host: any) {}
      }

      expect(TestController.prototype.test).toBeDefined();
    });

    it("should work with property parameter", () => {
      class TestController {
        test(@HostParam("subdomain") subdomain: string) {}
      }

      expect(TestController.prototype.test).toBeDefined();
    });
  });

  describe("@UploadedFile", () => {
    it("should work as parameter decorator", () => {
      class TestController {
        test(@UploadedFile("image") file: any) {}
      }

      expect(TestController.prototype.test).toBeDefined();
    });
  });

  describe("@UploadedFiles", () => {
    it("should work as parameter decorator", () => {
      class TestController {
        test(@UploadedFiles("images") files: any) {}
      }

      expect(TestController.prototype.test).toBeDefined();
    });
  });

  describe("@MultipleUploadedFiles", () => {
    it("should work as parameter decorator without fields", () => {
      class TestController {
        test(@MultipleUploadedFiles() files: any) {}
      }

      expect(TestController.prototype.test).toBeDefined();
    });

    it("should work with fields parameter", () => {
      class TestController {
        test(@MultipleUploadedFiles([{ field: "images" }, { field: "documents" }]) files: any) {}
      }

      expect(TestController.prototype.test).toBeDefined();
    });
  });
});