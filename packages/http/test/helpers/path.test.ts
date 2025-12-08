import { describe, expect, it } from "bun:test";

import {
  addLeadingSlash,
  normalizePath,
  stripEndSlash,
  isWildcard,
  isParam,
  isOptionalParam,
  getPathType
} from "~/helpers/path.helper.js";

describe("Path Helper", () => {
  describe("addLeadingSlash", () => {
    it("should add leading slash to path without one", () => {
      expect(addLeadingSlash("users")).toBe("/users");
      expect(addLeadingSlash("api/v1")).toBe("/api/v1");
    });

    it("should preserve existing leading slash", () => {
      expect(addLeadingSlash("/users")).toBe("/users");
      expect(addLeadingSlash("/api/v1")).toBe("/api/v1");
    });

    it("should return empty string for undefined", () => {
      expect(addLeadingSlash(undefined)).toBe("");
    });

    it("should return empty string for null", () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(addLeadingSlash(null as any)).toBe("");
    });

    it("should return empty string for non-string values", () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(addLeadingSlash(123 as any)).toBe("");
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(addLeadingSlash({} as any)).toBe("");
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(addLeadingSlash([] as any)).toBe("");
    });

    it("should handle empty string", () => {
      expect(addLeadingSlash("")).toBe("");
    });

    it("should handle root path", () => {
      expect(addLeadingSlash("/")).toBe("/");
    });

    it("should handle path with query parameters", () => {
      expect(addLeadingSlash("users?page=1")).toBe("/users?page=1");
    });

    it("should handle path with hash", () => {
      expect(addLeadingSlash("users#section")).toBe("/users#section");
    });
  });

  describe("normalizePath", () => {
    it("should add leading slash to paths without one", () => {
      expect(normalizePath("users")).toBe("/users");
      expect(normalizePath("api/v1")).toBe("/api/v1");
    });

    it("should preserve single leading slash", () => {
      expect(normalizePath("/users")).toBe("/users");
      expect(normalizePath("/api/v1")).toBe("/api/v1");
    });

    it("should normalize multiple leading slashes", () => {
      expect(normalizePath("//users")).toBe("/users");
      expect(normalizePath("///api/v1")).toBe("/api/v1");
    });

    it("should remove trailing slashes", () => {
      expect(normalizePath("/users/")).toBe("/users");
      expect(normalizePath("/api/v1//")).toBe("/api/v1");
      expect(normalizePath("users///")).toBe("/users");
    });

    it("should normalize multiple consecutive slashes in the middle", () => {
      expect(normalizePath("/api//v1")).toBe("/api/v1");
      expect(normalizePath("/api///v1")).toBe("/api/v1");
      expect(normalizePath("api////users")).toBe("/api/users");
    });

    it("should return root for undefined", () => {
      expect(normalizePath(undefined)).toBe("/");
    });

    it("should return root for null", () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(normalizePath(null as any)).toBe("/");
    });

    it("should return root for empty string", () => {
      expect(normalizePath("")).toBe("/");
    });

    it("should handle root path", () => {
      expect(normalizePath("/")).toBe("/");
    });

    it("should handle complex paths", () => {
      expect(normalizePath("//api///v1//users//")).toBe("/api/v1/users");
    });

    it("should handle paths starting without slash", () => {
      expect(normalizePath("api//users/")).toBe("/api/users");
    });
  });

  describe("stripEndSlash", () => {
    it("should remove trailing slash", () => {
      expect(stripEndSlash("/users/")).toBe("/users");
      expect(stripEndSlash("/api/v1/")).toBe("/api/v1");
    });

    it("should preserve paths without trailing slash", () => {
      expect(stripEndSlash("/users")).toBe("/users");
      expect(stripEndSlash("/api/v1")).toBe("/api/v1");
    });

    it("should handle root path", () => {
      expect(stripEndSlash("/")).toBe("");
    });

    it("should handle empty string", () => {
      expect(stripEndSlash("")).toBe("");
    });

    it("should handle single character paths", () => {
      expect(stripEndSlash("a")).toBe("a");
      expect(stripEndSlash("a/")).toBe("a");
    });

    it("should only remove last slash", () => {
      expect(stripEndSlash("/api//users/")).toBe("/api//users");
    });

    it("should handle paths with query parameters", () => {
      expect(stripEndSlash("/users?page=1/")).toBe("/users?page=1");
    });

    it("should handle paths with hash", () => {
      expect(stripEndSlash("/users#section/")).toBe("/users#section");
    });
  });

  describe("isWildcard", () => {
    it("should detect asterisk wildcards", () => {
      expect(isWildcard("/api/*")).toBe(true);
      expect(isWildcard("/users/*/posts")).toBe(true);
      expect(isWildcard("*")).toBe(true);
    });

    it("should detect regex wildcards", () => {
      expect(isWildcard("/api/(.*)")).toBe(true);
      expect(isWildcard("/users/(.*)/posts")).toBe(true);
      expect(isWildcard("(.*)")).toBe(true);
    });

    it("should return false for non-wildcard paths", () => {
      expect(isWildcard("/users")).toBe(false);
      expect(isWildcard("/api/v1")).toBe(false);
      expect(isWildcard("/users/:id")).toBe(false);
    });

    it("should handle empty string", () => {
      expect(isWildcard("")).toBe(false);
    });

    it("should handle paths with escaped characters", () => {
      expect(isWildcard("/api/\\*")).toBe(true); // Still contains *
      expect(isWildcard("/api/\\(.*)")).toBe(true); // Still contains (.*)
    });

    it("should handle multiple wildcards", () => {
      expect(isWildcard("/api/*/users/*")).toBe(true);
      expect(isWildcard("/api/(.*)/users/(.*)")).toBe(true);
    });

    it("should handle mixed wildcards", () => {
      expect(isWildcard("/api/*/users/(.*)")).toBe(true);
    });
  });

  describe("isParam", () => {
    it("should detect simple parameters", () => {
      expect(isParam("/users/:id")).toBe(true);
      expect(isParam("/:userId")).toBe(true);
      expect(isParam("/api/:version/users")).toBe(true);
    });

    it("should detect multiple parameters", () => {
      expect(isParam("/users/:userId/posts/:postId")).toBe(true);
    });

    it("should return false for non-parameter paths", () => {
      expect(isParam("/users")).toBe(false);
      expect(isParam("/api/v1")).toBe(false);
      expect(isParam("/users/*")).toBe(false);
    });

    it("should detect optional parameters as parameters", () => {
      // Note: isParam detects :id? as a parameter (correctly), isOptionalParam is more specific
      expect(isParam("/users/:id?")).toBe(true);
    });

    it("should handle parameters with underscores and numbers", () => {
      expect(isParam("/users/:user_id")).toBe(true);
      expect(isParam("/users/:id123")).toBe(true);
    });

    it("should match most special characters except () and /", () => {
      // Note: regex matches :id part even if followed by () characters  
      expect(isParam("/users/:id()")).toBe(true); // :id matches, () is after
      expect(isParam("/users/:id?")).toBe(true); // Contains ? - allowed  
      expect(isParam("/users/:id_")).toBe(true); // Contains _ - allowed
      expect(isParam("/users/:id/")).toBe(true); // Valid param
    });

    it("should handle empty string", () => {
      expect(isParam("")).toBe(false);
    });

    it("should handle edge cases", () => {
      expect(isParam(":")).toBe(false); // Just colon
      expect(isParam("/:")).toBe(false); // Colon at end
      expect(isParam("/:/")).toBe(false); // Colon between slashes
    });
  });

  describe("isOptionalParam", () => {
    it("should detect optional parameters", () => {
      expect(isOptionalParam("/users/:id?")).toBe(true);
      expect(isOptionalParam("/:userId?")).toBe(true);
      expect(isOptionalParam("/api/:version?/users")).toBe(true);
    });

    it("should detect multiple optional parameters", () => {
      expect(isOptionalParam("/users/:userId?/posts/:postId?")).toBe(true);
    });

    it("should return false for required parameters", () => {
      expect(isOptionalParam("/users/:id")).toBe(false);
      expect(isOptionalParam("/:userId")).toBe(false);
    });

    it("should return false for non-parameter paths", () => {
      expect(isOptionalParam("/users")).toBe(false);
      expect(isOptionalParam("/api/v1")).toBe(false);
      expect(isOptionalParam("/users/*")).toBe(false);
    });

    it("should handle optional parameters with underscores and numbers", () => {
      expect(isOptionalParam("/users/:user_id?")).toBe(true);
      expect(isOptionalParam("/users/:id123?")).toBe(true);
    });

    it("should not match parameters with special characters", () => {
      expect(isOptionalParam("/users/:id()?")).toBe(false); // Contains ()
    });

    it("should handle empty string", () => {
      expect(isOptionalParam("")).toBe(false);
    });

    it("should handle edge cases", () => {
      expect(isOptionalParam(":?")).toBe(false); // Just colon and question mark
      expect(isOptionalParam("/:?")).toBe(false); // Colon and question mark at end
    });
  });

  describe("getPathType", () => {
    it("should return 'wildcard' for wildcard paths", () => {
      expect(getPathType("/api/*")).toBe("wildcard");
      expect(getPathType("/users/(.*)")).toBe("wildcard");
      expect(getPathType("*")).toBe("wildcard");
    });

    it("should return 'optional-param' for optional parameter paths", () => {
      expect(getPathType("/users/:id?")).toBe("optional-param");
      expect(getPathType("/:userId?")).toBe("optional-param");
      expect(getPathType("/api/:version?/users")).toBe("optional-param");
    });

    it("should return 'param' for parameter paths", () => {
      expect(getPathType("/users/:id")).toBe("param");
      expect(getPathType("/:userId")).toBe("param");
      expect(getPathType("/api/:version/users")).toBe("param");
    });

    it("should return 'static' for static paths", () => {
      expect(getPathType("/users")).toBe("static");
      expect(getPathType("/api/v1")).toBe("static");
      expect(getPathType("/")).toBe("static");
      expect(getPathType("")).toBe("static");
    });

    it("should prioritize wildcard over other types", () => {
      expect(getPathType("/users/:id/*")).toBe("wildcard");
      expect(getPathType("/users/:id?/(.*)")).toBe("wildcard");
    });

    it("should prioritize optional-param over regular param", () => {
      expect(getPathType("/users/:id?/:name")).toBe("optional-param");
    });

    it("should handle complex paths", () => {
      expect(getPathType("/api/v1/users/123")).toBe("static");
      expect(getPathType("/api/v1/users/:id/posts/:postId")).toBe("param");
      expect(getPathType("/api/v1/users/:id?/posts")).toBe("optional-param");
      expect(getPathType("/api/v1/users/*/posts")).toBe("wildcard");
    });

    it("should handle edge cases", () => {
      expect(getPathType("/")).toBe("static");
      expect(getPathType("")).toBe("static");
      expect(getPathType("api")).toBe("static");
    });
  });
});