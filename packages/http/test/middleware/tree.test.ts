import type { AdapterMiddlewareMetadata } from "~/interfaces/adapter.interface.js";

import { beforeEach, describe, expect, it } from "bun:test";

import { HttpMethod } from "~/enums/method.enum.js";
import { buildMiddlewareTree, filterMiddlewaresByMethod, getMiddlewaresForPattern } from "~/middleware/tree.js";

const createMiddleware = (path: string, method: HttpMethod, use: Function = () => {}): AdapterMiddlewareMetadata => ({
  path,
  handlers: [{ use, method, excludedPaths: [] }],
});

const createMultiMethodMiddleware = (path: string, methods: HttpMethod[], use: Function = () => {}): AdapterMiddlewareMetadata => ({
  path,
  handlers: methods.map(method => ({ use, method, excludedPaths: [] })),
});

describe("buildMiddlewareTree", () => {
  it("should create empty tree for empty middleware array", () => {
    const tree = buildMiddlewareTree([]);
    
    expect(tree.segment).toBe("/");
    expect(tree.children.size).toBe(0);
    expect(tree.middlewares).toEqual([]);
  });

  it("should build tree for root path middleware", () => {
    const middleware = createMiddleware("/", HttpMethod.GET);
    const tree = buildMiddlewareTree([middleware]);
    
    expect(tree.segment).toBe("/");
    expect(tree.children.size).toBe(0);
    expect(tree.middlewares).toEqual([middleware]);
  });

  it("should build tree for single level paths", () => {
    const apiMiddleware = createMiddleware("/api", HttpMethod.GET);
    const authMiddleware = createMiddleware("/auth", HttpMethod.POST);
    const tree = buildMiddlewareTree([apiMiddleware, authMiddleware]);
    
    expect(tree.children.has("api")).toBe(true);
    expect(tree.children.has("auth")).toBe(true);
    expect(tree.children.get("api")?.middlewares).toEqual([apiMiddleware]);
    expect(tree.children.get("auth")?.middlewares).toEqual([authMiddleware]);
  });

  it("should build tree for nested paths", () => {
    const middleware = createMiddleware("/api/v1/users", HttpMethod.GET);
    const tree = buildMiddlewareTree([middleware]);
    
    const apiNode = tree.children.get("api");
    expect(apiNode?.segment).toBe("api");
    
    const v1Node = apiNode?.children.get("v1");
    expect(v1Node?.segment).toBe("v1");
    
    const usersNode = v1Node?.children.get("users");
    expect(usersNode?.segment).toBe("users");
    expect(usersNode?.middlewares).toEqual([middleware]);
  });

  it("should handle parameter segments", () => {
    const middleware = createMiddleware("/api/:id/profile", HttpMethod.GET);
    const tree = buildMiddlewareTree([middleware]);
    
    const apiNode = tree.children.get("api");
    const idNode = apiNode?.children.get(":id");
    const profileNode = idNode?.children.get("profile");
    
    expect(idNode?.segment).toBe(":id");
    expect(profileNode?.middlewares).toEqual([middleware]);
  });

  it("should handle wildcard segments", () => {
    const middleware = createMiddleware("/api/*/files", HttpMethod.GET);
    const tree = buildMiddlewareTree([middleware]);
    
    const apiNode = tree.children.get("api");
    const wildcardNode = apiNode?.children.get("*");
    const filesNode = wildcardNode?.children.get("files");
    
    expect(wildcardNode?.segment).toBe("*");
    expect(filesNode?.middlewares).toEqual([middleware]);
  });

  it("should handle multiple middleware on same path", () => {
    const middleware1 = createMiddleware("/api", HttpMethod.GET);
    const middleware2 = createMiddleware("/api", HttpMethod.POST);
    const tree = buildMiddlewareTree([middleware1, middleware2]);
    
    const apiNode = tree.children.get("api");
    expect(apiNode?.middlewares).toEqual([middleware1, middleware2]);
  });

  it("should handle paths with leading and trailing slashes", () => {
    const middleware1 = createMiddleware("/api/", HttpMethod.GET);
    const middleware2 = createMiddleware("api", HttpMethod.POST);
    const tree = buildMiddlewareTree([middleware1, middleware2]);
    
    const apiNode = tree.children.get("api");
    expect(apiNode?.middlewares).toEqual([middleware1, middleware2]);
  });

  it("should build complex tree structure", () => {
    const middlewares = [
      createMiddleware("/", HttpMethod.ALL),
      createMiddleware("/api", HttpMethod.GET),
      createMiddleware("/api/v1", HttpMethod.GET),
      createMiddleware("/api/v1/users", HttpMethod.GET),
      createMiddleware("/api/v1/users/:id", HttpMethod.GET),
      createMiddleware("/auth", HttpMethod.POST),
      createMiddleware("/public/*", HttpMethod.GET),
    ];
    const tree = buildMiddlewareTree(middlewares);
    
    expect(tree.middlewares.length).toBe(1);
    expect(tree.children.size).toBe(3);
    expect(tree.children.has("api")).toBe(true);
    expect(tree.children.has("auth")).toBe(true);
    expect(tree.children.has("public")).toBe(true);
    
    const apiNode = tree.children.get("api");
    expect(apiNode?.middlewares.length).toBe(1);
    expect(apiNode?.children.has("v1")).toBe(true);
    
    const v1Node = apiNode?.children.get("v1");
    expect(v1Node?.middlewares.length).toBe(1);
    expect(v1Node?.children.has("users")).toBe(true);
    
    const usersNode = v1Node?.children.get("users");
    expect(usersNode?.middlewares.length).toBe(1);
    expect(usersNode?.children.has(":id")).toBe(true);
  });

  it("should handle empty path segments correctly", () => {
    const middleware = createMiddleware("//api///users//", HttpMethod.GET);
    const tree = buildMiddlewareTree([middleware]);
    
    const apiNode = tree.children.get("api");
    const usersNode = apiNode?.children.get("users");
    
    expect(usersNode?.middlewares).toEqual([middleware]);
  });
});

describe("filterMiddlewaresByMethod", () => {
  it("should return empty array for empty middleware array", () => {
    const result = filterMiddlewaresByMethod([], HttpMethod.GET);
    expect(result).toEqual([]);
  });

  it("should filter middleware by specific method", () => {
    const getMiddleware = createMiddleware("/api", HttpMethod.GET);
    const postMiddleware = createMiddleware("/api", HttpMethod.POST);
    const middlewares = [getMiddleware, postMiddleware];
    
    const result = filterMiddlewaresByMethod(middlewares, HttpMethod.GET);
    
    expect(result).toEqual([
      {
        path: "/api",
        handlers: [{ use: expect.any(Function), method: HttpMethod.GET, excludedPaths: [] }],
      },
    ]);
  });

  it("should include ALL method middleware for any specific method", () => {
    const allMiddleware = createMiddleware("/api", HttpMethod.ALL);
    const getMiddleware = createMiddleware("/auth", HttpMethod.GET);
    const middlewares = [allMiddleware, getMiddleware];
    
    const result = filterMiddlewaresByMethod(middlewares, HttpMethod.POST);
    
    expect(result).toEqual([
      {
        path: "/api",
        handlers: [{ use: expect.any(Function), method: HttpMethod.ALL, excludedPaths: [] }],
      },
    ]);
  });

  it("should include both specific method and ALL method handlers", () => {
    const mixedMiddleware = createMultiMethodMiddleware("/api", [HttpMethod.GET, HttpMethod.ALL]);
    const middlewares = [mixedMiddleware];
    
    const result = filterMiddlewaresByMethod(middlewares, HttpMethod.GET);
    
    expect(result[0].handlers).toHaveLength(2);
    expect(result[0].handlers.some(h => h.method === HttpMethod.GET)).toBe(true);
    expect(result[0].handlers.some(h => h.method === HttpMethod.ALL)).toBe(true);
  });

  it("should filter out middleware with no matching handlers", () => {
    const postMiddleware = createMiddleware("/api", HttpMethod.POST);
    const deleteMiddleware = createMiddleware("/auth", HttpMethod.DELETE);
    const middlewares = [postMiddleware, deleteMiddleware];
    
    const result = filterMiddlewaresByMethod(middlewares, HttpMethod.GET);
    
    expect(result).toEqual([]);
  });

  it("should handle middleware with multiple handlers", () => {
    const multiMethodMiddleware = createMultiMethodMiddleware("/api", [HttpMethod.GET, HttpMethod.POST, HttpMethod.PUT]);
    const middlewares = [multiMethodMiddleware];
    
    const result = filterMiddlewaresByMethod(middlewares, HttpMethod.POST);
    
    expect(result[0].handlers).toHaveLength(1);
    expect(result[0].handlers[0].method).toBe(HttpMethod.POST);
  });

  it("should preserve middleware path and handler structure", () => {
    const mockUse = () => "test";
    const middleware: AdapterMiddlewareMetadata = {
      path: "/custom/path",
      handlers: [
        { use: mockUse, method: HttpMethod.GET, excludedPaths: [] },
        { use: mockUse, method: HttpMethod.ALL, excludedPaths: [] },
      ],
    };
    
    const result = filterMiddlewaresByMethod([middleware], HttpMethod.GET);
    
    expect(result[0]).toEqual({
      path: "/custom/path",
      handlers: [
        { use: mockUse, method: HttpMethod.GET, excludedPaths: [] },
        { use: mockUse, method: HttpMethod.ALL, excludedPaths: [] },
      ],
    });
  });

  it("should handle all HTTP methods correctly", () => {
    const methods = [
      HttpMethod.GET, HttpMethod.POST, HttpMethod.PUT, 
      HttpMethod.DELETE, HttpMethod.PATCH, HttpMethod.OPTIONS, 
      HttpMethod.HEAD, HttpMethod.SEARCH,
    ];
    
    methods.forEach(method => {
      const middleware = createMiddleware("/test", method);
      const result = filterMiddlewaresByMethod([middleware], method);
      
      expect(result).toHaveLength(1);
      expect(result[0].handlers[0].method).toBe(method);
    });
  });
});

describe("getMiddlewaresForPattern", () => {
  let tree: ReturnType<typeof buildMiddlewareTree>;

  beforeEach(() => {
    const middlewares = [
      createMiddleware("/", HttpMethod.ALL),
      createMiddleware("/api", HttpMethod.GET),
      createMiddleware("/api/v1", HttpMethod.POST),
      createMiddleware("/api/v1/users", HttpMethod.GET),
      createMiddleware("/api/v1/users/:id", HttpMethod.GET),
      createMiddleware("/api/:version", HttpMethod.ALL),
      createMiddleware("/public/*", HttpMethod.GET),
      createMiddleware("/files/*/download", HttpMethod.GET),
    ];
    tree = buildMiddlewareTree(middlewares);
  });

  it("should return root middleware for root path", () => {
    const result = getMiddlewaresForPattern(tree, "/", HttpMethod.ALL);
    
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("/");
  });

  it("should collect middleware along path", () => {
    const result = getMiddlewaresForPattern(tree, "/api/v1/users", HttpMethod.GET);
    
    expect(result).toHaveLength(4);
    expect(result.map(m => m.path)).toEqual(["/", "/api", "/api/:version", "/api/v1/users"]);
  });

  it("should match parameter segments", () => {
    const result = getMiddlewaresForPattern(tree, "/api/v2", HttpMethod.ALL);
    
    expect(result).toHaveLength(2);
    expect(result.map(m => m.path)).toEqual(["/", "/api/:version"]);
  });

  it("should match parameter segments in nested paths", () => {
    const result = getMiddlewaresForPattern(tree, "/api/v1/users/123", HttpMethod.GET);
    
    expect(result).toHaveLength(5);
    expect(result.map(m => m.path)).toEqual(["/", "/api", "/api/:version", "/api/v1/users", "/api/v1/users/:id"]);
  });

  it("should match wildcard segments", () => {
    const result = getMiddlewaresForPattern(tree, "/public/anything", HttpMethod.GET);
    
    expect(result).toHaveLength(2);
    expect(result.map(m => m.path)).toEqual(["/", "/public/*"]);
  });

  it("should match wildcard in nested paths", () => {
    const result = getMiddlewaresForPattern(tree, "/files/documents/download", HttpMethod.GET);
    
    expect(result).toHaveLength(2);
    expect(result.map(m => m.path)).toEqual(["/", "/files/*/download"]);
  });

  it("should handle non-matching paths", () => {
    const result = getMiddlewaresForPattern(tree, "/nonexistent/path", HttpMethod.GET);
    
    expect(result).toHaveLength(1);
    expect(result.map(m => m.path)).toEqual(["/"]);
  });

  it("should filter by HTTP method", () => {
    const result = getMiddlewaresForPattern(tree, "/api/v1", HttpMethod.POST);
    
    expect(result).toHaveLength(3);
    expect(result.map(m => m.path)).toEqual(["/", "/api/:version", "/api/v1"]);
    
    const getResult = getMiddlewaresForPattern(tree, "/api/v1", HttpMethod.GET);
    expect(getResult).toHaveLength(3);
    expect(getResult.map(m => m.path)).toEqual(["/", "/api", "/api/:version"]);
  });

  it("should include ALL method middleware for any HTTP method", () => {
    const result = getMiddlewaresForPattern(tree, "/api/v2", HttpMethod.DELETE);
    
    expect(result).toHaveLength(2);
    expect(result.map(m => m.path)).toEqual(["/", "/api/:version"]);
  });

  it("should handle empty path patterns", () => {
    const result = getMiddlewaresForPattern(tree, "", HttpMethod.GET);
    
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("/");
  });

  it("should handle paths with leading slashes correctly", () => {
    const result1 = getMiddlewaresForPattern(tree, "/api/v1/users", HttpMethod.GET);
    const result2 = getMiddlewaresForPattern(tree, "api/v1/users", HttpMethod.GET);
    
    expect(result1).toEqual(result2);
  });

  it("should handle paths with trailing slashes correctly", () => {
    const result1 = getMiddlewaresForPattern(tree, "/api/", HttpMethod.GET);
    const result2 = getMiddlewaresForPattern(tree, "/api", HttpMethod.GET);
    
    expect(result1).toEqual(result2);
  });

  it("should prioritize literal matches over parameter matches", () => {
    const specificTree = buildMiddlewareTree([
      createMiddleware("/api/users", HttpMethod.GET),
      createMiddleware("/api/:id", HttpMethod.GET),
    ]);
    
    const result = getMiddlewaresForPattern(specificTree, "/api/users", HttpMethod.GET);
    
    expect(result).toHaveLength(2);
    expect(result.map(m => m.path)).toEqual(["/api/:id", "/api/users"]);
  });

  it("should collect middleware from wildcard nodes during traversal", () => {
    const wildcardTree = buildMiddlewareTree([
      createMiddleware("/api", HttpMethod.GET),
      createMiddleware("/api/*", HttpMethod.ALL),
      createMiddleware("/api/users", HttpMethod.POST),
    ]);
    
    const result = getMiddlewaresForPattern(wildcardTree, "/api/users", HttpMethod.POST);
    
    expect(result).toHaveLength(2);
    expect(result.map(m => m.path)).toEqual(["/api/*", "/api/users"]);
  });

  it("should collect middleware from parameter nodes during traversal", () => {
    const paramTree = buildMiddlewareTree([
      createMiddleware("/api", HttpMethod.GET),
      createMiddleware("/api/:id", HttpMethod.ALL),
      createMiddleware("/api/users", HttpMethod.POST),
    ]);
    
    const result = getMiddlewaresForPattern(paramTree, "/api/users", HttpMethod.POST);
    
    expect(result).toHaveLength(2);
    expect(result.map(m => m.path)).toEqual(["/api/:id", "/api/users"]);
  });

  it("should handle complex nested parameter and wildcard patterns", () => {
    const complexTree = buildMiddlewareTree([
      createMiddleware("/", HttpMethod.ALL),
      createMiddleware("/api", HttpMethod.ALL),
      createMiddleware("/api/:version", HttpMethod.GET),
      createMiddleware("/api/*", HttpMethod.POST),
      createMiddleware("/api/v1/users/:id", HttpMethod.GET),
      createMiddleware("/api/*/files", HttpMethod.GET),
    ]);
    
    const result = getMiddlewaresForPattern(complexTree, "/api/v1/users/123", HttpMethod.GET);
    
    expect(result).toHaveLength(4);
    expect(result.map(m => m.path)).toEqual(["/", "/api", "/api/:version", "/api/v1/users/:id"]);
  });

  it("should stop traversal when no matching children exist", () => {
    const result = getMiddlewaresForPattern(tree, "/api/v1/users/123/nonexistent/deep/path", HttpMethod.GET);
    
    expect(result).toHaveLength(5);
    expect(result.map(m => m.path)).toEqual(["/", "/api", "/api/:version", "/api/v1/users", "/api/v1/users/:id"]);
  });

  it("should handle parameter patterns with colons in the pattern itself", () => {
    const result = getMiddlewaresForPattern(tree, "/api/:version", HttpMethod.ALL);
    
    expect(result).toHaveLength(2);
    expect(result.map(m => m.path)).toEqual(["/", "/api/:version"]);
  });

  it("should handle wildcard patterns with asterisks in the pattern itself", () => {
    const result = getMiddlewaresForPattern(tree, "/public/*", HttpMethod.GET);
    
    expect(result).toHaveLength(2);
    expect(result.map(m => m.path)).toEqual(["/", "/public/*"]);
  });

  it("should collect final middleware when path traversal completes", () => {
    const result = getMiddlewaresForPattern(tree, "/api", HttpMethod.GET);
    
    expect(result).toHaveLength(2);
    expect(result.map(m => m.path)).toEqual(["/", "/api"]);
  });

  it("should handle wildcards in middle of path correctly", () => {
    const middlewareTree = buildMiddlewareTree([
      createMiddleware("/", HttpMethod.ALL),
      createMiddleware("/api", HttpMethod.GET),
      createMiddleware("/api/*", HttpMethod.ALL),
      createMiddleware("/api/*/users", HttpMethod.GET),
      createMiddleware("/api/*/users/:id", HttpMethod.GET),
      createMiddleware("/api/v1/users", HttpMethod.POST),
    ]);
    
    // Test wildcard in middle: /api/v1/users
    const result1 = getMiddlewaresForPattern(middlewareTree, "/api/v1/users", HttpMethod.GET);
    expect(result1).toHaveLength(4);
    expect(result1.map(m => m.path)).toEqual(["/", "/api", "/api/*", "/api/*/users"]);
    
    // Test wildcard + param: /api/v1/users/123
    const result2 = getMiddlewaresForPattern(middlewareTree, "/api/v1/users/123", HttpMethod.GET);
    expect(result2).toHaveLength(5);
    expect(result2.map(m => m.path)).toEqual(["/", "/api", "/api/*", "/api/*/users", "/api/*/users/:id"]);
    
    // Test literal match over wildcard: /api/v1/users (POST)
    const result3 = getMiddlewaresForPattern(middlewareTree, "/api/v1/users", HttpMethod.POST);
    expect(result3).toHaveLength(3);
    expect(result3.map(m => m.path)).toEqual(["/", "/api/*", "/api/v1/users"]);
  });

  it("should handle parameters in middle of path correctly", () => {
    const middlewareTree = buildMiddlewareTree([
      createMiddleware("/", HttpMethod.ALL),
      createMiddleware("/users", HttpMethod.GET),
      createMiddleware("/users/:id", HttpMethod.ALL),
      createMiddleware("/users/:id/posts", HttpMethod.GET),
      createMiddleware("/users/:id/posts/:postId", HttpMethod.GET),
      createMiddleware("/users/profile", HttpMethod.GET),
      createMiddleware("/users/settings", HttpMethod.POST),
    ]);
    
    // Test param in middle: /users/123/posts
    const result1 = getMiddlewaresForPattern(middlewareTree, "/users/123/posts", HttpMethod.GET);
    expect(result1).toHaveLength(4);
    expect(result1.map(m => m.path)).toEqual(["/", "/users", "/users/:id", "/users/:id/posts"]);
    
    // Test param + param: /users/123/posts/456
    const result2 = getMiddlewaresForPattern(middlewareTree, "/users/123/posts/456", HttpMethod.GET);
    expect(result2).toHaveLength(5);
    expect(result2.map(m => m.path)).toEqual(["/", "/users", "/users/:id", "/users/:id/posts", "/users/:id/posts/:postId"]);
    
    // Test literal match over param: /users/profile
    const result3 = getMiddlewaresForPattern(middlewareTree, "/users/profile", HttpMethod.GET);
    expect(result3).toHaveLength(4);
    expect(result3.map(m => m.path)).toEqual(["/", "/users", "/users/:id", "/users/profile"]);
    
    // Test literal match: /users/settings
    const result4 = getMiddlewaresForPattern(middlewareTree, "/users/settings", HttpMethod.POST);
    expect(result4).toHaveLength(3);
    expect(result4.map(m => m.path)).toEqual(["/", "/users/:id", "/users/settings"]);
  });

  it("should handle complex mixed patterns without duplicates", () => {
    const complexTree = buildMiddlewareTree([
      createMiddleware("/", HttpMethod.ALL),
      createMiddleware("/api", HttpMethod.ALL),
      createMiddleware("/api/*", HttpMethod.ALL),
      createMiddleware("/api/:version", HttpMethod.GET),
      createMiddleware("/api/*/auth", HttpMethod.POST),
      createMiddleware("/api/:version/users", HttpMethod.GET),
      createMiddleware("/api/*/users/:id", HttpMethod.GET),
      createMiddleware("/api/:version/users/:id", HttpMethod.DELETE),
      createMiddleware("/api/v1", HttpMethod.POST),
      createMiddleware("/api/v1/users", HttpMethod.POST),
    ]);
    
    // Test complex path with wildcard and params: /api/v2/users/123
    const result1 = getMiddlewaresForPattern(complexTree, "/api/v2/users/123", HttpMethod.GET);
    expect(result1).toHaveLength(6);
    expect(result1.map(m => m.path)).toEqual([
      "/", 
      "/api", 
      "/api/*",
      "/api/*/users/:id",
      "/api/:version", 
      "/api/:version/users",
    ]);
    
    // Test with literal match: /api/v1/users
    const result2 = getMiddlewaresForPattern(complexTree, "/api/v1/users", HttpMethod.POST);
    expect(result2).toHaveLength(5);
    expect(result2.map(m => m.path)).toEqual([
      "/", 
      "/api", 
      "/api/*",
      "/api/v1",
      "/api/v1/users",
    ]);
    
    // Test DELETE with param: /api/v1/users/123
    const result3 = getMiddlewaresForPattern(complexTree, "/api/v1/users/123", HttpMethod.DELETE);
    expect(result3).toHaveLength(4);
    expect(result3.map(m => m.path)).toEqual([
      "/", 
      "/api", 
      "/api/*",
      "/api/:version/users/:id",
    ]);
  });

  it("should handle edge case with multiple wildcards and params", () => {
    const edgeCaseTree = buildMiddlewareTree([
      createMiddleware("/", HttpMethod.GET),
      createMiddleware("/files", HttpMethod.GET),
      createMiddleware("/files/*", HttpMethod.GET),
      createMiddleware("/files/*/download", HttpMethod.GET),
      createMiddleware("/files/:type", HttpMethod.POST),
      createMiddleware("/files/:type/upload", HttpMethod.POST),
      createMiddleware("/files/images", HttpMethod.GET),
      createMiddleware("/files/images/thumbnails", HttpMethod.GET),
    ]);
    
    // Wildcard path: /files/documents/download
    const result1 = getMiddlewaresForPattern(edgeCaseTree, "/files/documents/download", HttpMethod.GET);
    expect(result1).toHaveLength(4);
    expect(result1.map(m => m.path)).toEqual(["/", "/files", "/files/*", "/files/*/download"]);
    
    // Param path: /files/videos/upload  
    const result2 = getMiddlewaresForPattern(edgeCaseTree, "/files/videos/upload", HttpMethod.POST);
    expect(result2).toHaveLength(2);
    expect(result2.map(m => m.path)).toEqual(["/files/:type", "/files/:type/upload"]);
    
    // Literal path: /files/images/thumbnails
    const result3 = getMiddlewaresForPattern(edgeCaseTree, "/files/images/thumbnails", HttpMethod.GET);
    expect(result3).toHaveLength(5);
    expect(result3.map(m => m.path)).toEqual(["/", "/files", "/files/*", "/files/images", "/files/images/thumbnails"]);
  });
});

describe("edge cases and error handling", () => {
  it("should handle malformed middleware metadata", () => {
    const malformedMiddleware = {
      path: "/test",
      handlers: [],
    } as AdapterMiddlewareMetadata;
    
    const tree = buildMiddlewareTree([malformedMiddleware]);
    const result = getMiddlewaresForPattern(tree, "/test", HttpMethod.GET);
    
    expect(result).toHaveLength(0);
  });

  it("should handle undefined tree gracefully", () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const result = getMiddlewaresForPattern(undefined as any, "/test", HttpMethod.GET);
    
    expect(result).toEqual([]);
  });

  it("should handle very deep path nesting", () => {
    const deepPath = "/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/y/z";
    const middleware = createMiddleware(deepPath, HttpMethod.GET);
    const tree = buildMiddlewareTree([middleware]);
    
    const result = getMiddlewaresForPattern(tree, deepPath, HttpMethod.GET);
    
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe(deepPath);
  });

  it("should handle paths with special characters", () => {
    const specialPath = "/api/user-123/profile_data";
    const middleware = createMiddleware(specialPath, HttpMethod.GET);
    const tree = buildMiddlewareTree([middleware]);
    
    const result = getMiddlewaresForPattern(tree, specialPath, HttpMethod.GET);
    
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe(specialPath);
  });

  it("should handle large number of middleware efficiently", () => {
    const middlewares: AdapterMiddlewareMetadata[] = [];
    
    for (let i = 0; i < 1000; i++) {
      middlewares.push(createMiddleware(`/api/route${i}`, HttpMethod.GET));
    }
    
    const tree = buildMiddlewareTree(middlewares);
    const result = getMiddlewaresForPattern(tree, "/api/route999", HttpMethod.GET);
    
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("/api/route999");
  });

  it("should maintain correct tree structure with conflicting path patterns", () => {
    const middlewares = [
      createMiddleware("/api/:id", HttpMethod.GET),
      createMiddleware("/api/users", HttpMethod.GET),
      createMiddleware("/api/*", HttpMethod.GET),
      createMiddleware("/api/admin", HttpMethod.GET),
    ];
    
    const tree = buildMiddlewareTree(middlewares);
    
    const usersResult = getMiddlewaresForPattern(tree, "/api/users", HttpMethod.GET);
    const adminResult = getMiddlewaresForPattern(tree, "/api/admin", HttpMethod.GET);
    const paramResult = getMiddlewaresForPattern(tree, "/api/123", HttpMethod.GET);
    
    expect(usersResult.map(m => m.path)).toEqual(["/api/*", "/api/:id", "/api/users"]);
    expect(adminResult.map(m => m.path)).toEqual(["/api/*", "/api/:id", "/api/admin"]);
    expect(paramResult.map(m => m.path)).toEqual(["/api/*", "/api/:id"]);
  });
});