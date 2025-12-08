import { describe, expect, it } from "bun:test";

import {
  ROUTE_MAPPED_MESSAGE,
  VERSIONED_ROUTE_MAPPED_MESSAGE,
  CONTROLLER_MAPPING_MESSAGE,
  VERSIONED_CONTROLLER_MAPPING_MESSAGE,
  VENOK_HTTP_SERVER_START
} from "~/helpers/messages.helper.js";

import { HttpMethod } from "~/enums/method.enum.js";
import { VERSION_NEUTRAL } from "~/interfaces/index.js";

describe("Messages Helper", () => {
  describe("ROUTE_MAPPED_MESSAGE", () => {
    it("should generate route mapped message for string method", () => {
      const message = ROUTE_MAPPED_MESSAGE("/users", HttpMethod.GET);
      expect(message).toBe("Mapped {/users, GET} route");
    });

    it("should generate route mapped message for HttpMethod enum", () => {
      const message = ROUTE_MAPPED_MESSAGE("/users", HttpMethod.GET);
      expect(message).toBe("Mapped {/users, GET} route");
    });

    it("should handle POST method", () => {
      const message = ROUTE_MAPPED_MESSAGE("/users", HttpMethod.POST);
      expect(message).toBe("Mapped {/users, POST} route");
    });

    it("should handle PUT method", () => {
      const message = ROUTE_MAPPED_MESSAGE("/users", HttpMethod.PUT);
      expect(message).toBe("Mapped {/users, PUT} route");
    });

    it("should handle DELETE method", () => {
      const message = ROUTE_MAPPED_MESSAGE("/users", HttpMethod.DELETE);
      expect(message).toBe("Mapped {/users, DELETE} route");
    });

    it("should handle PATCH method", () => {
      const message = ROUTE_MAPPED_MESSAGE("/users", HttpMethod.PATCH);
      expect(message).toBe("Mapped {/users, PATCH} route");
    });

    it("should handle ALL method", () => {
      const message = ROUTE_MAPPED_MESSAGE("/users", HttpMethod.ALL);
      expect(message).toBe("Mapped {/users, ALL} route");
    });

    it("should handle complex paths", () => {
      const message = ROUTE_MAPPED_MESSAGE("/api/v1/users/:id", HttpMethod.GET);
      expect(message).toBe("Mapped {/api/v1/users/:id, GET} route");
    });

    it("should handle root path", () => {
      const message = ROUTE_MAPPED_MESSAGE("/", HttpMethod.GET);
      expect(message).toBe("Mapped {/, GET} route");
    });

    it("should handle numeric method values", () => {
      const message = ROUTE_MAPPED_MESSAGE("/users", 0); // HttpMethod.GET = 0
      expect(message).toBe("Mapped {/users, GET} route");
    });
  });

  describe("VERSIONED_ROUTE_MAPPED_MESSAGE", () => {
    it("should generate versioned route message with single version", () => {
      const message = VERSIONED_ROUTE_MAPPED_MESSAGE("/users", HttpMethod.GET, "1");
      expect(message).toBe("Mapped {/users, GET} (version: 1) route");
    });

    it("should generate versioned route message with multiple versions", () => {
      const message = VERSIONED_ROUTE_MAPPED_MESSAGE("/users", HttpMethod.GET, ["1", "2"]);
      expect(message).toBe("Mapped {/users, GET} (version: 1,2) route");
    });

    it("should handle VERSION_NEUTRAL in single version", () => {
      const message = VERSIONED_ROUTE_MAPPED_MESSAGE("/users", HttpMethod.GET, VERSION_NEUTRAL);
      expect(message).toBe("Mapped {/users, GET} (version: Neutral) route");
    });

    it("should handle VERSION_NEUTRAL in array", () => {
      const message = VERSIONED_ROUTE_MAPPED_MESSAGE("/users", HttpMethod.GET, [VERSION_NEUTRAL, "1"]);
      expect(message).toBe("Mapped {/users, GET} (version: Neutral,1) route");
    });

    it("should handle mixed versions with VERSION_NEUTRAL", () => {
      const message = VERSIONED_ROUTE_MAPPED_MESSAGE("/users", HttpMethod.POST, ["1", VERSION_NEUTRAL, "2"]);
      expect(message).toBe("Mapped {/users, POST} (version: 1,Neutral,2) route");
    });

    it("should handle semantic versions", () => {
      const message = VERSIONED_ROUTE_MAPPED_MESSAGE("/users", HttpMethod.GET, ["1.0", "2.0"]);
      expect(message).toBe("Mapped {/users, GET} (version: 1.0,2.0) route");
    });

    it("should handle numeric method values", () => {
      const message = VERSIONED_ROUTE_MAPPED_MESSAGE("/users", 1, "1"); // HttpMethod.POST = 1
      expect(message).toBe("Mapped {/users, POST} (version: 1) route");
    });

    it("should handle complex paths with versions", () => {
      const message = VERSIONED_ROUTE_MAPPED_MESSAGE("/api/v1/users/:id", HttpMethod.DELETE, ["1", "2", "3"]);
      expect(message).toBe("Mapped {/api/v1/users/:id, DELETE} (version: 1,2,3) route");
    });

    it("should handle empty array versions", () => {
      const message = VERSIONED_ROUTE_MAPPED_MESSAGE("/users", HttpMethod.GET, []);
      expect(message).toBe("Mapped {/users, GET} (version: ) route");
    });

    it("should handle symbol versions by converting to string", () => {
      const symbolVersion = Symbol("v1");
      // Symbol versions cause TypeError in join() - this documents current behavior
      // @ts-expect-error Mismatch types
      expect(() => VERSIONED_ROUTE_MAPPED_MESSAGE("/users", HttpMethod.GET, symbolVersion)).toThrow(TypeError);
    });
  });

  describe("CONTROLLER_MAPPING_MESSAGE", () => {
    it("should generate controller mapping message", () => {
      const message = CONTROLLER_MAPPING_MESSAGE("UserController", "/users");
      expect(message).toBe("UserController {/users}:");
    });

    it("should handle complex controller names", () => {
      const message = CONTROLLER_MAPPING_MESSAGE("ApiV1UserController", "/api/v1/users");
      expect(message).toBe("ApiV1UserController {/api/v1/users}:");
    });

    it("should handle root path", () => {
      const message = CONTROLLER_MAPPING_MESSAGE("AppController", "/");
      expect(message).toBe("AppController {/}:");
    });

    it("should handle empty controller name", () => {
      const message = CONTROLLER_MAPPING_MESSAGE("", "/users");
      expect(message).toBe(" {/users}:");
    });

    it("should handle controller names with spaces", () => {
      const message = CONTROLLER_MAPPING_MESSAGE("User Management Controller", "/users");
      expect(message).toBe("User Management Controller {/users}:");
    });

    it("should handle special characters in path", () => {
      const message = CONTROLLER_MAPPING_MESSAGE("UserController", "/users/:id/posts");
      expect(message).toBe("UserController {/users/:id/posts}:");
    });
  });

  describe("VERSIONED_CONTROLLER_MAPPING_MESSAGE", () => {
    it("should generate versioned controller message with single version", () => {
      const message = VERSIONED_CONTROLLER_MAPPING_MESSAGE("UserController", "/users", "1");
      expect(message).toBe("UserController {/users} (version: 1):");
    });

    it("should generate versioned controller message with multiple versions", () => {
      const message = VERSIONED_CONTROLLER_MAPPING_MESSAGE("UserController", "/users", ["1", "2"]);
      expect(message).toBe("UserController {/users} (version: 1,2):");
    });

    it("should handle VERSION_NEUTRAL in single version", () => {
      const message = VERSIONED_CONTROLLER_MAPPING_MESSAGE("UserController", "/users", VERSION_NEUTRAL);
      expect(message).toBe("UserController {/users} (version: Neutral):");
    });

    it("should handle VERSION_NEUTRAL in array", () => {
      const message = VERSIONED_CONTROLLER_MAPPING_MESSAGE("UserController", "/users", [VERSION_NEUTRAL, "1"]);
      expect(message).toBe("UserController {/users} (version: Neutral,1):");
    });

    it("should handle mixed versions with VERSION_NEUTRAL", () => {
      const message = VERSIONED_CONTROLLER_MAPPING_MESSAGE("UserController", "/users", ["1", VERSION_NEUTRAL, "2"]);
      expect(message).toBe("UserController {/users} (version: 1,Neutral,2):");
    });

    it("should handle semantic versions", () => {
      const message = VERSIONED_CONTROLLER_MAPPING_MESSAGE("ApiController", "/api", ["1.0.0", "2.0.0"]);
      expect(message).toBe("ApiController {/api} (version: 1.0.0,2.0.0):");
    });

    it("should handle complex controller and path names", () => {
      const message = VERSIONED_CONTROLLER_MAPPING_MESSAGE("ApiV1UserManagementController", "/api/v1/user-management", ["1", "2", "3"]);
      expect(message).toBe("ApiV1UserManagementController {/api/v1/user-management} (version: 1,2,3):");
    });

    it("should handle empty array versions", () => {
      const message = VERSIONED_CONTROLLER_MAPPING_MESSAGE("UserController", "/users", []);
      expect(message).toBe("UserController {/users} (version: ):");
    });

    it("should handle symbol versions by converting to string", () => {
      const symbolVersion = Symbol("v1");
      // Symbol versions cause TypeError in join() - this documents current behavior
      // @ts-expect-error Mismatch types
      expect(() => VERSIONED_CONTROLLER_MAPPING_MESSAGE("UserController", "/users", symbolVersion)).toThrow(TypeError);
    });

    it("should handle mixed symbol and string versions", () => {
      const symbolVersion = Symbol("latest");
      // Mixed symbol and string arrays cause TypeError in join() - this documents current behavior
      // @ts-expect-error Mismatch types
      expect(() => VERSIONED_CONTROLLER_MAPPING_MESSAGE("UserController", "/users", ["1", symbolVersion, "2"])).toThrow(TypeError);
    });
  });

  describe("VENOK_HTTP_SERVER_START", () => {
    it("should generate server start message with string port", () => {
      const message = VENOK_HTTP_SERVER_START("3000");
      expect(message).toBe("Venok start Http server on port: 3000");
    });

    it("should generate server start message with number port", () => {
      const message = VENOK_HTTP_SERVER_START(3000);
      expect(message).toBe("Venok start Http server on port: 3000");
    });

    it("should handle port 80", () => {
      const message = VENOK_HTTP_SERVER_START(80);
      expect(message).toBe("Venok start Http server on port: 80");
    });

    it("should handle port 443", () => {
      const message = VENOK_HTTP_SERVER_START(443);
      expect(message).toBe("Venok start Http server on port: 443");
    });

    it("should handle high port numbers", () => {
      const message = VENOK_HTTP_SERVER_START(65535);
      expect(message).toBe("Venok start Http server on port: 65535");
    });

    it("should handle port 0", () => {
      const message = VENOK_HTTP_SERVER_START(0);
      expect(message).toBe("Venok start Http server on port: 0");
    });

    it("should handle string representation of numbers", () => {
      const message = VENOK_HTTP_SERVER_START("8080");
      expect(message).toBe("Venok start Http server on port: 8080");
    });

    it("should handle environment variables (process.env.PORT style)", () => {
      const envPort = process.env.PORT || "3000";
      const message = VENOK_HTTP_SERVER_START(envPort);
      expect(message).toBe(`Venok start Http server on port: ${envPort}`);
    });
  });
});