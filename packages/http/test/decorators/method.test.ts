/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, expect, it } from "bun:test";
import { 
  MethodMapping, 
  Get, 
  Post, 
  Put, 
  Patch, 
  Delete, 
  Options, 
  Head, 
  All, 
  Search 
} from "~/decorators/method.decorator.js";
import { METHOD_METADATA, PATH_METADATA } from "~/constants.js";
import { HttpMethod } from "~/enums/method.enum.js";

describe("HTTP Method Decorators", () => {
  describe("MethodMapping", () => {
    it("should have KEY property", () => {
      expect(MethodMapping.KEY).toBeDefined();
      expect(typeof MethodMapping.KEY).toBe("string");
    });

    it("should set default metadata when no options provided", () => {
      class TestController {
        @MethodMapping()
        test() {}
      }

      const path = Reflect.getMetadata(PATH_METADATA, TestController.prototype.test);
      const method = Reflect.getMetadata(METHOD_METADATA, TestController.prototype.test);
      
      expect(path).toBe("/");
      expect(method).toBe(HttpMethod.GET);
    });

    it("should set custom path and method from metadata", () => {
      class TestController {
        @MethodMapping({ [PATH_METADATA]: "/users", [METHOD_METADATA]: HttpMethod.POST })
        test() {}
      }

      const path = Reflect.getMetadata(PATH_METADATA, TestController.prototype.test);
      const method = Reflect.getMetadata(METHOD_METADATA, TestController.prototype.test);
      
      expect(path).toBe("/users");
      expect(method).toBe(HttpMethod.POST);
    });

    it("should use default path when path is empty", () => {
      class TestController {
        @MethodMapping({ [PATH_METADATA]: "", [METHOD_METADATA]: HttpMethod.POST })
        test() {}
      }

      const path = Reflect.getMetadata(PATH_METADATA, TestController.prototype.test);
      const method = Reflect.getMetadata(METHOD_METADATA, TestController.prototype.test);
      
      expect(path).toBe("/");
      expect(method).toBe(HttpMethod.POST);
    });

    it("should handle array paths", () => {
      class TestController {
        @MethodMapping({ [PATH_METADATA]: ["users", "profiles"], [METHOD_METADATA]: HttpMethod.GET })
        test() {}
      }

      const path = Reflect.getMetadata(PATH_METADATA, TestController.prototype.test);
      const method = Reflect.getMetadata(METHOD_METADATA, TestController.prototype.test);
      
      expect(path).toEqual(["users", "profiles"]);
      expect(method).toBe(HttpMethod.GET);
    });
  });

  describe("@Get", () => {
    it("should set GET method metadata with default path", () => {
      class TestController {
        @Get()
        test() {}
      }

      const path = Reflect.getMetadata(PATH_METADATA, TestController.prototype.test);
      const method = Reflect.getMetadata(METHOD_METADATA, TestController.prototype.test);
      
      expect(path).toBe("/");
      expect(method).toBe(HttpMethod.GET);
    });

    it("should set GET method metadata with custom path", () => {
      class TestController {
        @Get("/users")
        test() {}
      }

      const path = Reflect.getMetadata(PATH_METADATA, TestController.prototype.test);
      const method = Reflect.getMetadata(METHOD_METADATA, TestController.prototype.test);
      
      expect(path).toBe("/users");
      expect(method).toBe(HttpMethod.GET);
    });

    it("should handle array paths", () => {
      class TestController {
        @Get(["/users", "/profiles"])
        test() {}
      }

      const path = Reflect.getMetadata(PATH_METADATA, TestController.prototype.test);
      const method = Reflect.getMetadata(METHOD_METADATA, TestController.prototype.test);
      
      expect(path).toEqual(["/users", "/profiles"]);
      expect(method).toBe(HttpMethod.GET);
    });
  });

  describe("@Post", () => {
    it("should set POST method metadata with default path", () => {
      class TestController {
        @Post()
        test() {}
      }

      const path = Reflect.getMetadata(PATH_METADATA, TestController.prototype.test);
      const method = Reflect.getMetadata(METHOD_METADATA, TestController.prototype.test);
      
      expect(path).toBe("/");
      expect(method).toBe(HttpMethod.POST);
    });

    it("should set POST method metadata with custom path", () => {
      class TestController {
        @Post("/users")
        test() {}
      }

      const path = Reflect.getMetadata(PATH_METADATA, TestController.prototype.test);
      const method = Reflect.getMetadata(METHOD_METADATA, TestController.prototype.test);
      
      expect(path).toBe("/users");
      expect(method).toBe(HttpMethod.POST);
    });
  });

  describe("@Put", () => {
    it("should set PUT method metadata with default path", () => {
      class TestController {
        @Put()
        test() {}
      }

      const path = Reflect.getMetadata(PATH_METADATA, TestController.prototype.test);
      const method = Reflect.getMetadata(METHOD_METADATA, TestController.prototype.test);
      
      expect(path).toBe("/");
      expect(method).toBe(HttpMethod.PUT);
    });

    it("should set PUT method metadata with custom path", () => {
      class TestController {
        @Put("/users/:id")
        test() {}
      }

      const path = Reflect.getMetadata(PATH_METADATA, TestController.prototype.test);
      const method = Reflect.getMetadata(METHOD_METADATA, TestController.prototype.test);
      
      expect(path).toBe("/users/:id");
      expect(method).toBe(HttpMethod.PUT);
    });
  });

  describe("@Patch", () => {
    it("should set PATCH method metadata with default path", () => {
      class TestController {
        @Patch()
        test() {}
      }

      const path = Reflect.getMetadata(PATH_METADATA, TestController.prototype.test);
      const method = Reflect.getMetadata(METHOD_METADATA, TestController.prototype.test);
      
      expect(path).toBe("/");
      expect(method).toBe(HttpMethod.PATCH);
    });

    it("should set PATCH method metadata with custom path", () => {
      class TestController {
        @Patch("/users/:id")
        test() {}
      }

      const path = Reflect.getMetadata(PATH_METADATA, TestController.prototype.test);
      const method = Reflect.getMetadata(METHOD_METADATA, TestController.prototype.test);
      
      expect(path).toBe("/users/:id");
      expect(method).toBe(HttpMethod.PATCH);
    });
  });

  describe("@Delete", () => {
    it("should set DELETE method metadata with default path", () => {
      class TestController {
        @Delete()
        test() {}
      }

      const path = Reflect.getMetadata(PATH_METADATA, TestController.prototype.test);
      const method = Reflect.getMetadata(METHOD_METADATA, TestController.prototype.test);
      
      expect(path).toBe("/");
      expect(method).toBe(HttpMethod.DELETE);
    });

    it("should set DELETE method metadata with custom path", () => {
      class TestController {
        @Delete("/users/:id")
        test() {}
      }

      const path = Reflect.getMetadata(PATH_METADATA, TestController.prototype.test);
      const method = Reflect.getMetadata(METHOD_METADATA, TestController.prototype.test);
      
      expect(path).toBe("/users/:id");
      expect(method).toBe(HttpMethod.DELETE);
    });
  });

  describe("@Options", () => {
    it("should set OPTIONS method metadata with default path", () => {
      class TestController {
        @Options()
        test() {}
      }

      const path = Reflect.getMetadata(PATH_METADATA, TestController.prototype.test);
      const method = Reflect.getMetadata(METHOD_METADATA, TestController.prototype.test);
      
      expect(path).toBe("/");
      expect(method).toBe(HttpMethod.OPTIONS);
    });

    it("should set OPTIONS method metadata with custom path", () => {
      class TestController {
        @Options("/users")
        test() {}
      }

      const path = Reflect.getMetadata(PATH_METADATA, TestController.prototype.test);
      const method = Reflect.getMetadata(METHOD_METADATA, TestController.prototype.test);
      
      expect(path).toBe("/users");
      expect(method).toBe(HttpMethod.OPTIONS);
    });
  });

  describe("@Head", () => {
    it("should set HEAD method metadata with default path", () => {
      class TestController {
        @Head()
        test() {}
      }

      const path = Reflect.getMetadata(PATH_METADATA, TestController.prototype.test);
      const method = Reflect.getMetadata(METHOD_METADATA, TestController.prototype.test);
      
      expect(path).toBe("/");
      expect(method).toBe(HttpMethod.HEAD);
    });

    it("should set HEAD method metadata with custom path", () => {
      class TestController {
        @Head("/users")
        test() {}
      }

      const path = Reflect.getMetadata(PATH_METADATA, TestController.prototype.test);
      const method = Reflect.getMetadata(METHOD_METADATA, TestController.prototype.test);
      
      expect(path).toBe("/users");
      expect(method).toBe(HttpMethod.HEAD);
    });
  });

  describe("@All", () => {
    it("should set ALL method metadata with default path", () => {
      class TestController {
        @All()
        test() {}
      }

      const path = Reflect.getMetadata(PATH_METADATA, TestController.prototype.test);
      const method = Reflect.getMetadata(METHOD_METADATA, TestController.prototype.test);
      
      expect(path).toBe("/");
      expect(method).toBe(HttpMethod.ALL);
    });

    it("should set ALL method metadata with custom path", () => {
      class TestController {
        @All("/api/*")
        test() {}
      }

      const path = Reflect.getMetadata(PATH_METADATA, TestController.prototype.test);
      const method = Reflect.getMetadata(METHOD_METADATA, TestController.prototype.test);
      
      expect(path).toBe("/api/*");
      expect(method).toBe(HttpMethod.ALL);
    });
  });

  describe("@Search", () => {
    it("should set SEARCH method metadata with default path", () => {
      class TestController {
        @Search()
        test() {}
      }

      const path = Reflect.getMetadata(PATH_METADATA, TestController.prototype.test);
      const method = Reflect.getMetadata(METHOD_METADATA, TestController.prototype.test);
      
      expect(path).toBe("/");
      expect(method).toBe(HttpMethod.SEARCH);
    });

    it("should set SEARCH method metadata with custom path", () => {
      class TestController {
        @Search("/search")
        test() {}
      }

      const path = Reflect.getMetadata(PATH_METADATA, TestController.prototype.test);
      const method = Reflect.getMetadata(METHOD_METADATA, TestController.prototype.test);
      
      expect(path).toBe("/search");
      expect(method).toBe(HttpMethod.SEARCH);
    });
  });

  describe("Multiple decorators on same class", () => {
    it("should handle different methods with different paths", () => {
      class TestController {
        @Get("/users")
        getUsers() {}

        @Post("/users")
        createUser() {}

        @Put("/users/:id")
        updateUser() {}

        @Delete("/users/:id")
        deleteUser() {}
      }

      const getPath = Reflect.getMetadata(PATH_METADATA, TestController.prototype.getUsers);
      const getMethod = Reflect.getMetadata(METHOD_METADATA, TestController.prototype.getUsers);
      const postPath = Reflect.getMetadata(PATH_METADATA, TestController.prototype.createUser);
      const postMethod = Reflect.getMetadata(METHOD_METADATA, TestController.prototype.createUser);
      const putPath = Reflect.getMetadata(PATH_METADATA, TestController.prototype.updateUser);
      const putMethod = Reflect.getMetadata(METHOD_METADATA, TestController.prototype.updateUser);
      const deletePath = Reflect.getMetadata(PATH_METADATA, TestController.prototype.deleteUser);
      const deleteMethod = Reflect.getMetadata(METHOD_METADATA, TestController.prototype.deleteUser);
      
      expect(getMethod).toBe(HttpMethod.GET);
      expect(getPath).toBe("/users");
      
      expect(postMethod).toBe(HttpMethod.POST);
      expect(postPath).toBe("/users");
      
      expect(putMethod).toBe(HttpMethod.PUT);
      expect(putPath).toBe("/users/:id");
      
      expect(deleteMethod).toBe(HttpMethod.DELETE);
      expect(deletePath).toBe("/users/:id");
    });
  });

  describe("Preserve method functionality", () => {
    it("should preserve original method functionality", () => {
      class TestController {
        @Get("/test")
        test() {
          return "test result";
        }

        @Post("/async")
        async asyncTest() {
          return Promise.resolve("async result");
        }
      }

      const controller = new TestController();
      expect(controller.test()).toBe("test result");
      expect(controller.asyncTest()).toBeInstanceOf(Promise);
    });
  });
});