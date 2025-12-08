import type { RoutePathMetadata, VersioningOptions } from "~/interfaces/index.js";

import { beforeEach, describe, expect, it, mock } from "bun:test";

import { VERSION_NEUTRAL } from "~/interfaces/index.js";
import { RoutePathFactory } from "~/router/path-factory.js";
import { HttpConfig } from "~/http/config.js";
import { HttpMethod } from "~/enums/method.enum.js";
import { HttpVersioningType } from "~/enums/version-type.enum.js";

describe("RoutePathFactory", () => {
  let factory: RoutePathFactory;
  let config: HttpConfig;

  beforeEach(() => {
    config = {
      getGlobalPrefixOptions: mock(() => ({ exclude: [] })),
    } as unknown as HttpConfig;
    factory = new RoutePathFactory(config);
  });

  describe("create", () => {
    describe("basic path creation", () => {
      it("should create root path when no metadata provided", () => {
        const metadata: RoutePathMetadata = {};
        const paths = factory.create(metadata);

        expect(paths).toEqual(["/"]);
      });

      it("should create path with controller path only", () => {
        const metadata: RoutePathMetadata = {
          controllerPath: "users",
        };
        const paths = factory.create(metadata);

        expect(paths).toEqual(["/users"]);
      });

      it("should create path with method path only", () => {
        const metadata: RoutePathMetadata = {
          methodPath: "profile",
        };
        const paths = factory.create(metadata);

        expect(paths).toEqual(["/profile"]);
      });

      it("should create path with controller and method paths", () => {
        const metadata: RoutePathMetadata = {
          controllerPath: "users",
          methodPath: "profile",
        };
        const paths = factory.create(metadata);

        expect(paths).toEqual(["/users/profile"]);
      });

      it("should create path with module, controller and method paths", () => {
        const metadata: RoutePathMetadata = {
          modulePath: "api",
          controllerPath: "users",
          methodPath: "profile",
        };
        const paths = factory.create(metadata);

        expect(paths).toEqual(["/api/users/profile"]);
      });

      it("should handle empty string paths correctly", () => {
        const metadata: RoutePathMetadata = {
          controllerPath: "",
          methodPath: "",
        };
        const paths = factory.create(metadata);

        expect(paths).toEqual(["/"]);
      });

      it("should handle paths with slashes correctly", () => {
        const metadata: RoutePathMetadata = {
          controllerPath: "/users/",
          methodPath: "/profile/",
        };
        const paths = factory.create(metadata);

        expect(paths).toEqual(["/users/profile"]);
      });
    });

    describe("versioning", () => {
      describe("URI versioning", () => {
        it("should add version prefix with single version", () => {
          const metadata: RoutePathMetadata = {
            controllerPath: "users",
            methodVersion: "1",
            versioningOptions: {
              type: HttpVersioningType.URI,
            },
          };
          const paths = factory.create(metadata);

          expect(paths).toEqual(["/v1/users"]);
        });

        it("should add version prefix with multiple versions", () => {
          const metadata: RoutePathMetadata = {
            controllerPath: "users",
            methodVersion: ["1", "2"],
            versioningOptions: {
              type: HttpVersioningType.URI,
            },
          };
          const paths = factory.create(metadata);

          expect(paths).toEqual(["/v1/users", "/v2/users"]);
        });

        it("should use custom version prefix", () => {
          const metadata: RoutePathMetadata = {
            controllerPath: "users",
            methodVersion: "1",
            versioningOptions: {
              type: HttpVersioningType.URI,
              prefix: "version",
            },
          };
          const paths = factory.create(metadata);

          expect(paths).toEqual(["/version1/users"]);
        });

        it("should use no prefix when prefix is false", () => {
          const metadata: RoutePathMetadata = {
            controllerPath: "users",
            methodVersion: "1",
            versioningOptions: {
              type: HttpVersioningType.URI,
              prefix: false,
            },
          };
          const paths = factory.create(metadata);

          expect(paths).toEqual(["/1/users"]);
        });

        it("should handle VERSION_NEUTRAL in single version", () => {
          const metadata: RoutePathMetadata = {
            controllerPath: "users",
            methodVersion: VERSION_NEUTRAL,
            versioningOptions: {
              type: HttpVersioningType.URI,
            },
          };
          const paths = factory.create(metadata);

          expect(paths).toEqual(["/users"]);
        });

        it("should handle VERSION_NEUTRAL in multiple versions", () => {
          const metadata: RoutePathMetadata = {
            controllerPath: "users",
            methodVersion: ["1", VERSION_NEUTRAL, "2"],
            versioningOptions: {
              type: HttpVersioningType.URI,
            },
          };
          const paths = factory.create(metadata);

          expect(paths).toEqual(["/v1/users", "/users", "/v2/users"]);
        });

        it("should prioritize methodVersion over controllerVersion", () => {
          const metadata: RoutePathMetadata = {
            controllerPath: "users",
            controllerVersion: "1",
            methodVersion: "2",
            versioningOptions: {
              type: HttpVersioningType.URI,
            },
          };
          const paths = factory.create(metadata);

          expect(paths).toEqual(["/v2/users"]);
        });

        it("should use controllerVersion when methodVersion is not provided", () => {
          const metadata: RoutePathMetadata = {
            controllerPath: "users",
            controllerVersion: "1",
            versioningOptions: {
              type: HttpVersioningType.URI,
            },
          };
          const paths = factory.create(metadata);

          expect(paths).toEqual(["/v1/users"]);
        });
      });

      describe("non-URI versioning", () => {
        it("should not add version to path with HEADER versioning", () => {
          const metadata: RoutePathMetadata = {
            controllerPath: "users",
            methodVersion: "1",
            versioningOptions: {
              type: HttpVersioningType.HEADER,
              header: "X-Version",
            },
          };
          const paths = factory.create(metadata);

          expect(paths).toEqual(["/users"]);
        });
      });
    });

    describe("global prefix", () => {
      it("should add global prefix to paths", () => {
        const metadata: RoutePathMetadata = {
          controllerPath: "users",
          globalPrefix: "/api",
        };
        const paths = factory.create(metadata);

        expect(paths).toEqual(["/api/users"]);
      });

      it("should add global prefix with trailing slash correctly", () => {
        const metadata: RoutePathMetadata = {
          controllerPath: "users",
          globalPrefix: "/api/",
        };
        const paths = factory.create(metadata);

        expect(paths).toEqual(["/api/users"]);
      });
    });

    describe("complex scenarios", () => {
      it("should handle all path components with versioning and global prefix", () => {
        const metadata: RoutePathMetadata = {
          modulePath: "v1",
          controllerPath: "users",
          methodPath: "profile",
          methodVersion: "2",
          globalPrefix: "/api",
          versioningOptions: {
            type: HttpVersioningType.URI,
          },
        };
        const paths = factory.create(metadata);

        expect(paths).toEqual(["/api/v2/v1/users/profile"]);
      });
    });
  });

  describe("extractControllerPath", () => {
    it("should return empty array for undefined path", () => {
      // @ts-expect-error Mismatch types
      const result = factory.extractControllerPath(undefined);
      expect(result).toEqual([]);
    });

    it("should handle single string path", () => {
      const result = factory.extractControllerPath("users");
      expect(result).toEqual(["/users"]);
    });

    it("should handle string path with leading slash", () => {
      const result = factory.extractControllerPath("/users");
      expect(result).toEqual(["/users"]);
    });

    it("should handle array of paths", () => {
      const result = factory.extractControllerPath(["users", "accounts"]);
      expect(result).toEqual(["/users", "/accounts"]);
    });

    it("should add leading slashes to array paths", () => {
      const result = factory.extractControllerPath(["/users", "accounts"]);
      expect(result).toEqual(["/users", "/accounts"]);
    });

    it("should handle empty string", () => {
      const result = factory.extractControllerPath("");
      expect(result).toEqual([""]);
    });

    it("should handle array with empty strings", () => {
      const result = factory.extractControllerPath(["", "users"]);
      expect(result).toEqual(["", "/users"]);
    });
  });

  describe("getVersion", () => {
    it("should return methodVersion when both are provided", () => {
      const metadata: RoutePathMetadata = {
        controllerVersion: "1",
        methodVersion: "2",
      };
      const result = factory.getVersion(metadata);
      expect(result).toBe("2");
    });

    it("should return controllerVersion when methodVersion is not provided", () => {
      const metadata: RoutePathMetadata = {
        controllerVersion: "1",
      };
      const result = factory.getVersion(metadata);
      expect(result).toBe("1");
    });

    it("should return undefined when no versions are provided", () => {
      const metadata: RoutePathMetadata = {};
      const result = factory.getVersion(metadata);
      expect(result).toBeUndefined();
    });

    it("should handle VERSION_NEUTRAL", () => {
      const metadata: RoutePathMetadata = {
        methodVersion: VERSION_NEUTRAL,
      };
      const result = factory.getVersion(metadata);
      expect(result).toBe(VERSION_NEUTRAL);
    });

    it("should handle array versions", () => {
      const metadata: RoutePathMetadata = {
        methodVersion: ["1", "2"],
      };
      const result = factory.getVersion(metadata);
      expect(result).toEqual(["1", "2"]);
    });
  });

  describe("getVersionPrefix", () => {
    it("should return default prefix 'v' for URI versioning", () => {
      const versioningOptions: VersioningOptions = {
        type: HttpVersioningType.URI,
      };
      const result = factory.getVersionPrefix(versioningOptions);
      expect(result).toBe("v");
    });

    it("should return custom prefix for URI versioning", () => {
      const versioningOptions: VersioningOptions = {
        type: HttpVersioningType.URI,
        prefix: "version",
      };
      const result = factory.getVersionPrefix(versioningOptions);
      expect(result).toBe("version");
    });

    it("should return empty string when prefix is false", () => {
      const versioningOptions: VersioningOptions = {
        type: HttpVersioningType.URI,
        prefix: false,
      };
      const result = factory.getVersionPrefix(versioningOptions);
      expect(result).toBe("");
    });

    it("should return default prefix for non-URI versioning", () => {
      const versioningOptions: VersioningOptions = {
        type: HttpVersioningType.HEADER,
        header: "X-Version",
      };
      const result = factory.getVersionPrefix(versioningOptions);
      expect(result).toBe("v");
    });
  });

  describe("appendToAllIfDefined", () => {
    it("should return paths unchanged when fragment is undefined", () => {
      const paths = ["/api", "/v1"];
      const result = factory.appendToAllIfDefined(paths, undefined);
      expect(result).toEqual(["/api", "/v1"]);
    });

    it("should return paths unchanged when fragment is empty string", () => {
      const paths = ["/api", "/v1"];
      const result = factory.appendToAllIfDefined(paths, "");
      expect(result).toEqual(["/api", "/v1"]);
    });

    it("should append string fragment to all paths", () => {
      const paths = ["/api", "/v1"];
      const result = factory.appendToAllIfDefined(paths, "users");
      expect(result).toEqual(["/api/users", "/v1/users"]);
    });

    it("should append array fragments to all paths", () => {
      const paths = ["/api", "/v1"];
      const result = factory.appendToAllIfDefined(paths, ["users", "accounts"]);
      expect(result).toEqual(["/api/users", "/api/accounts", "/v1/users", "/v1/accounts"]);
    });

    it("should handle empty paths array", () => {
      const paths: string[] = [];
      const result = factory.appendToAllIfDefined(paths, "users");
      expect(result).toEqual([]);
    });

    it("should handle paths with trailing slashes", () => {
      const paths = ["/api/", "/v1/"];
      const result = factory.appendToAllIfDefined(paths, "/users");
      expect(result).toEqual(["/api/users", "/v1/users"]);
    });

    it("should handle empty string in paths", () => {
      const paths = ["", "/v1"];
      const result = factory.appendToAllIfDefined(paths, "users");
      expect(result).toEqual(["/users", "/v1/users"]);
    });
  });

  describe("isExcludedFromGlobalPrefix", () => {
    it("should return false when requestMethod is undefined", () => {
      const result = factory.isExcludedFromGlobalPrefix("/users");
      expect(result).toBe(false);
    });

    it("should return false when exclude array is empty", () => {
      config.getGlobalPrefixOptions = mock(() => ({ exclude: [] }));

      const result = factory.isExcludedFromGlobalPrefix("/users", HttpMethod.GET);
      expect(result).toBe(false);
    });
  });

  describe("truncateVersionPrefixFromPath (private method)", () => {
    const callTruncateVersionPrefixFromPath = (
      path: string,
      versionValue: string | string[],
      versioningOptions: VersioningOptions
    ) => {
      return (factory as any).truncateVersionPrefixFromPath(path, versionValue, versioningOptions);
    };

    it("should truncate single version prefix from path", () => {
      const versioningOptions: VersioningOptions = {
        type: HttpVersioningType.URI,
      };

      const result = callTruncateVersionPrefixFromPath("/v1/users", "1", versioningOptions);
      expect(result).toBe("/users");
    });

    it("should truncate custom version prefix from path", () => {
      const versioningOptions: VersioningOptions = {
        type: HttpVersioningType.URI,
        prefix: "version",
      };

      const result = callTruncateVersionPrefixFromPath("/version1/users", "1", versioningOptions);
      expect(result).toBe("/users");
    });

    it("should handle path without version prefix", () => {
      const versioningOptions: VersioningOptions = {
        type: HttpVersioningType.URI,
      };

      const result = callTruncateVersionPrefixFromPath("/users", "1", versioningOptions);
      expect(result).toBe("/users");
    });

    it("should handle array of versions", () => {
      const versioningOptions: VersioningOptions = {
        type: HttpVersioningType.URI,
      };

      const result = callTruncateVersionPrefixFromPath("/v2/users", ["1", "2"], versioningOptions);
      expect(result).toBe("/users");
    });

    it("should handle array with first matching version", () => {
      const versioningOptions: VersioningOptions = {
        type: HttpVersioningType.URI,
      };

      const result = callTruncateVersionPrefixFromPath("/v1/users", ["1", "2"], versioningOptions);
      expect(result).toBe("/users");
    });

    it("should handle empty prefix", () => {
      const versioningOptions: VersioningOptions = {
        type: HttpVersioningType.URI,
        prefix: false,
      };

      const result = callTruncateVersionPrefixFromPath("/1/users", "1", versioningOptions);
      expect(result).toBe("/users");
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle null and undefined values in metadata", () => {
      const metadata: RoutePathMetadata = {
        controllerPath: undefined,
        methodPath: undefined,
        modulePath: undefined,
      };
      const paths = factory.create(metadata);

      expect(paths).toEqual(["/"]);
    });

    it("should handle empty arrays in path components", () => {
      const metadata: RoutePathMetadata = {};
      const paths = factory.create(metadata);

      expect(paths).toEqual(["/"]);
    });

    it("should handle mixed valid and invalid path components", () => {
      const controllerPaths = ["users", "", "accounts"];
      const paths: string[] = [];
      
      controllerPaths.forEach((controllerPath) => {
        const metadata: RoutePathMetadata = {
          controllerPath: controllerPath,
          methodPath: "profile",
        };
        paths.push(...factory.create(metadata));
      });
      

      expect(paths).toEqual(["/users/profile", "/profile", "/accounts/profile"]);
    });

    it("should handle complex path combinations", () => {
      const modulesPaths = ["api", "v1"];
      const controllerPaths = ["users", "accounts"];
      const methodPaths = ["profile", "settings"];
      const paths: string[] = [];
      
      modulesPaths.forEach((modulePath) => {
        controllerPaths.forEach((controllerPath) => {
          methodPaths.forEach((methodPath) => {
            const metadata: RoutePathMetadata = {
              modulePath,
              controllerPath,
              methodPath,
              globalPrefix: "/app",
            };
            
            paths.push(...factory.create(metadata));
          });
        });
      });

      expect(paths).toEqual([
        "/app/api/users/profile",
        "/app/api/users/settings",
        "/app/api/accounts/profile",
        "/app/api/accounts/settings",
        "/app/v1/users/profile",
        "/app/v1/users/settings",
        "/app/v1/accounts/profile",
        "/app/v1/accounts/settings",
      ]);
    });
  });
});