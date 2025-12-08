import type { 
  ExcludeRouteMetadata,
  GlobalPrefixOptions,
  HttpAppOptions,
  VersioningOptions
} from "~/interfaces/index.js";
import type { AbstractHttpAdapter } from "~/http/adapter.js";

import { beforeEach, describe, expect, it, mock } from "bun:test";

import { HttpConfig } from "~/http/config.js";
import { HttpVersioningType } from "~/enums/version-type.enum.js";

describe("HttpConfig", () => {
  let config: HttpConfig;
  let mockAdapter: AbstractHttpAdapter;
  let options: Required<HttpAppOptions>;

  beforeEach(() => {
    mockAdapter = {
      listen: mock(() => {}),
      close: mock(() => {}),
      setNotFoundHandler: mock(() => {}),
      setErrorHandler: mock(() => {}),
      use: mock(() => {}),
      get: mock(() => {}),
      post: mock(() => {}),
      put: mock(() => {}),
      delete: mock(() => {}),
      patch: mock(() => {}),
      head: mock(() => {}),
      options: mock(() => {}),
      all: mock(() => {}),
    } as any;

    options = {
      port: 3000,
      hostname: "localhost",
      listenCallback: mock(() => Promise.resolve()),
      callback: mock(() => {}),
      adapter: mockAdapter,
    };

    config = new HttpConfig(options);
  });

  describe("constructor", () => {
    it("should initialize with provided options", () => {
      expect(config.getHttpAdapterRef()).toBe(mockAdapter);
    });

    it("should initialize with default values", () => {
      expect(config.getGlobalPrefix()).toBe("");
      expect(config.getGlobalPrefixOptions()).toEqual({});
      expect(config.getVersioning()).toBeUndefined();
    });

    it("should accept options through dependency injection", () => {
      const customOptions: Required<HttpAppOptions> = {
        port: 8080,
        hostname: "0.0.0.0",
        listenCallback: mock(() => Promise.resolve()),
        callback: mock(() => {}),
        adapter: mockAdapter,
      };

      const customConfig = new HttpConfig(customOptions);
      expect(customConfig.getHttpAdapterRef()).toBe(mockAdapter);
    });
  });

  describe("HTTP Adapter Management", () => {
    describe("setHttpAdapter", () => {
      it("should set new HTTP adapter", () => {
        const newAdapter = {
          listen: mock(() => {}),
          close: mock(() => {}),
        } as any;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        config.setHttpAdapter(newAdapter);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        expect(config.getHttpAdapterRef()).toBe(newAdapter);
      });

      it("should replace existing adapter", () => {
        const originalAdapter = config.getHttpAdapterRef();
        const newAdapter = {
          listen: mock(() => {}),
          close: mock(() => {}),
        } as any;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        config.setHttpAdapter(newAdapter);
        expect(config.getHttpAdapterRef()).not.toBe(originalAdapter);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        expect(config.getHttpAdapterRef()).toBe(newAdapter);
      });
    });

    describe("getHttpAdapterRef", () => {
      it("should return the current HTTP adapter", () => {
        expect(config.getHttpAdapterRef()).toBe(mockAdapter);
      });

      it("should return updated adapter after setting new one", () => {
        const newAdapter = { test: true } as any;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        config.setHttpAdapter(newAdapter);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        expect(config.getHttpAdapterRef()).toBe(newAdapter);
      });
    });
  });

  describe("Global Prefix Management", () => {
    describe("setGlobalPrefix", () => {
      it("should set empty prefix", () => {
        config.setGlobalPrefix("");
        expect(config.getGlobalPrefix()).toBe("");
      });

      it("should set simple prefix", () => {
        config.setGlobalPrefix("api");
        expect(config.getGlobalPrefix()).toBe("api");
      });

      it("should set complex prefix with slashes", () => {
        config.setGlobalPrefix("/api/v1");
        expect(config.getGlobalPrefix()).toBe("/api/v1");
      });

      it("should set prefix with special characters", () => {
        config.setGlobalPrefix("api-v1_test");
        expect(config.getGlobalPrefix()).toBe("api-v1_test");
      });

      it("should override existing prefix", () => {
        config.setGlobalPrefix("api");
        config.setGlobalPrefix("v2");
        expect(config.getGlobalPrefix()).toBe("v2");
      });
    });

    describe("getGlobalPrefix", () => {
      it("should return empty string by default", () => {
        expect(config.getGlobalPrefix()).toBe("");
      });

      it("should return set prefix", () => {
        config.setGlobalPrefix("test-prefix");
        expect(config.getGlobalPrefix()).toBe("test-prefix");
      });
    });
  });

  describe("Global Prefix Options Management", () => {
    describe("setGlobalPrefixOptions", () => {
      it("should set empty options", () => {
        const emptyOptions: GlobalPrefixOptions<ExcludeRouteMetadata> = {};
        config.setGlobalPrefixOptions(emptyOptions);
        expect(config.getGlobalPrefixOptions()).toEqual({});
      });

      it("should set options with exclude array", () => {
        const excludeOptions: GlobalPrefixOptions<ExcludeRouteMetadata> = {
          exclude: [
            {
              path: "/health",
              pathRegex: /^\/health$/,
              requestMethod: "GET" as any,
            },
            {
              path: "/metrics",
              pathRegex: /^\/metrics$/,
              requestMethod: "GET" as any,
            },
          ],
        };
        config.setGlobalPrefixOptions(excludeOptions);
        expect(config.getGlobalPrefixOptions()).toEqual(excludeOptions);
      });

      it("should override existing options", () => {
        const firstOptions: GlobalPrefixOptions<ExcludeRouteMetadata> = {
          exclude: [
            {
              path: "/health",
              pathRegex: /^\/health$/,
              requestMethod: "GET" as any,
            },
          ],
        };
        const secondOptions: GlobalPrefixOptions<ExcludeRouteMetadata> = {
          exclude: [
            {
              path: "/status",
              pathRegex: /^\/status$/,
              requestMethod: "POST" as any,
            },
          ],
        };

        config.setGlobalPrefixOptions(firstOptions);
        config.setGlobalPrefixOptions(secondOptions);
        expect(config.getGlobalPrefixOptions()).toEqual(secondOptions);
      });

      it("should handle complex exclude options with multiple methods", () => {
        const complexOptions: GlobalPrefixOptions<ExcludeRouteMetadata> = {
          exclude: [
            {
              path: "/api/health",
              pathRegex: /^\/api\/health$/,
              requestMethod: "GET" as any,
            },
            {
              path: "/api/health",
              pathRegex: /^\/api\/health$/,
              requestMethod: "POST" as any,
            },
          ],
        };
        config.setGlobalPrefixOptions(complexOptions);
        expect(config.getGlobalPrefixOptions()).toEqual(complexOptions);
      });
    });

    describe("getGlobalPrefixOptions", () => {
      it("should return empty object by default", () => {
        expect(config.getGlobalPrefixOptions()).toEqual({});
      });

      it("should return set options", () => {
        const options: GlobalPrefixOptions<ExcludeRouteMetadata> = {
          exclude: [
            {
              path: "/test",
              pathRegex: /^\/test$/,
              requestMethod: "DELETE" as any,
            },
          ],
        };
        config.setGlobalPrefixOptions(options);
        expect(config.getGlobalPrefixOptions()).toBe(options);
      });
    });
  });

  describe("Versioning Management", () => {
    describe("enableVersioning", () => {
      it("should enable header versioning", () => {
        const versioningOptions: VersioningOptions = {
          type: HttpVersioningType.HEADER,
          header: "X-API-Version",
          defaultVersion: "1",
        };

        config.enableVersioning(versioningOptions);
        expect(config.getVersioning()).toEqual(versioningOptions);
      });

      it("should enable URI versioning with default prefix", () => {
        const versioningOptions: VersioningOptions = {
          type: HttpVersioningType.URI,
          defaultVersion: ["1", "2"],
        };

        config.enableVersioning(versioningOptions);
        expect(config.getVersioning()).toEqual(versioningOptions);
      });

      it("should enable URI versioning with custom prefix", () => {
        const versioningOptions: VersioningOptions = {
          type: HttpVersioningType.URI,
          prefix: "version",
          defaultVersion: "1.0",
        };

        config.enableVersioning(versioningOptions);
        expect(config.getVersioning()).toEqual(versioningOptions);
      });

      it("should enable URI versioning without prefix", () => {
        const versioningOptions: VersioningOptions = {
          type: HttpVersioningType.URI,
          prefix: false,
          defaultVersion: "2",
        };

        config.enableVersioning(versioningOptions);
        expect(config.getVersioning()).toEqual(versioningOptions);
      });

      it("should enable media type versioning", () => {
        const versioningOptions: VersioningOptions = {
          type: HttpVersioningType.MEDIA_TYPE,
          key: "v=",
          defaultVersion: "1.0",
        };

        config.enableVersioning(versioningOptions);
        expect(config.getVersioning()).toEqual(versioningOptions);
      });

      it("should enable custom versioning", () => {
        const extractor = mock(() => "2.0");
        const versioningOptions: VersioningOptions = {
          type: HttpVersioningType.CUSTOM,
          extractor,
          defaultVersion: "1.0",
        };

        config.enableVersioning(versioningOptions);
        expect(config.getVersioning()).toEqual(versioningOptions);
      });

      it("should handle string default version", () => {
        const versioningOptions: VersioningOptions = {
          type: HttpVersioningType.HEADER,
          header: "Version",
          defaultVersion: "1.5",
        };

        config.enableVersioning(versioningOptions);
        expect(config.getVersioning()?.defaultVersion).toBe("1.5");
      });

      it("should deduplicate array default versions", () => {
        const versioningOptions: VersioningOptions = {
          type: HttpVersioningType.HEADER,
          header: "Version",
          defaultVersion: ["1", "2", "1", "3", "2"],
        };

        config.enableVersioning(versioningOptions);
        const enabledVersioning = config.getVersioning();
        expect(enabledVersioning?.defaultVersion).toEqual(["1", "2", "3"]);
      });

      it("should preserve order when deduplicating versions", () => {
        const versioningOptions: VersioningOptions = {
          type: HttpVersioningType.HEADER,
          header: "Version",
          defaultVersion: ["3", "1", "2", "3", "1"],
        };

        config.enableVersioning(versioningOptions);
        const enabledVersioning = config.getVersioning();
        expect(enabledVersioning?.defaultVersion).toEqual(["3", "1", "2"]);
      });

      it("should handle empty array default version", () => {
        const versioningOptions: VersioningOptions = {
          type: HttpVersioningType.HEADER,
          header: "Version",
          defaultVersion: [],
        };

        config.enableVersioning(versioningOptions);
        expect(config.getVersioning()?.defaultVersion).toEqual([]);
      });

      it("should handle single item array without duplication", () => {
        const versioningOptions: VersioningOptions = {
          type: HttpVersioningType.HEADER,
          header: "Version",
          defaultVersion: ["1.0"],
        };

        config.enableVersioning(versioningOptions);
        expect(config.getVersioning()?.defaultVersion).toEqual(["1.0"]);
      });

      it("should override existing versioning configuration", () => {
        const firstVersioning: VersioningOptions = {
          type: HttpVersioningType.HEADER,
          header: "X-Version",
          defaultVersion: "1",
        };
        const secondVersioning: VersioningOptions = {
          type: HttpVersioningType.URI,
          prefix: "v",
          defaultVersion: "2",
        };

        config.enableVersioning(firstVersioning);
        config.enableVersioning(secondVersioning);
        expect(config.getVersioning()).toEqual(secondVersioning);
      });
    });

    describe("getVersioning", () => {
      it("should return undefined by default", () => {
        expect(config.getVersioning()).toBeUndefined();
      });

      it("should return enabled versioning configuration", () => {
        const versioningOptions: VersioningOptions = {
          type: HttpVersioningType.MEDIA_TYPE,
          key: "version=",
          defaultVersion: "2.1",
        };

        config.enableVersioning(versioningOptions);
        expect(config.getVersioning()).toBe(versioningOptions);
      });
    });
  });

  describe("Integration Tests", () => {
    it("should maintain independent state for all configuration properties", () => {
      const prefix = "/api";
      const prefixOptions: GlobalPrefixOptions<ExcludeRouteMetadata> = {
        exclude: [
          {
            path: "/health",
            pathRegex: /^\/health$/,
            requestMethod: "GET" as any,
          },
        ],
      };
      const versioningOptions: VersioningOptions = {
        type: HttpVersioningType.HEADER,
        header: "X-Version",
        defaultVersion: ["1", "2"],
      };
      const newAdapter = { custom: true } as any;

      config.setGlobalPrefix(prefix);
      config.setGlobalPrefixOptions(prefixOptions);
      config.enableVersioning(versioningOptions);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      config.setHttpAdapter(newAdapter);

      expect(config.getGlobalPrefix()).toBe(prefix);
      expect(config.getGlobalPrefixOptions()).toBe(prefixOptions);
      expect(config.getVersioning()).toBe(versioningOptions);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(config.getHttpAdapterRef()).toBe(newAdapter);
    });

    it("should handle multiple configuration updates correctly", () => {
      config.setGlobalPrefix("v1");
      config.setGlobalPrefix("v2");
      config.setGlobalPrefix("v3");

      const firstOptions: GlobalPrefixOptions<ExcludeRouteMetadata> = { exclude: [] };
      const secondOptions: GlobalPrefixOptions<ExcludeRouteMetadata> = {
        exclude: [
          {
            path: "/test",
            pathRegex: /^\/test$/,
            requestMethod: "POST" as any,
          },
        ],
      };

      config.setGlobalPrefixOptions(firstOptions);
      config.setGlobalPrefixOptions(secondOptions);

      const firstVersioning: VersioningOptions = {
        type: HttpVersioningType.URI,
        defaultVersion: "1",
      };
      const secondVersioning: VersioningOptions = {
        type: HttpVersioningType.HEADER,
        header: "Version",
        defaultVersion: "2",
      };

      config.enableVersioning(firstVersioning);
      config.enableVersioning(secondVersioning);

      expect(config.getGlobalPrefix()).toBe("v3");
      expect(config.getGlobalPrefixOptions()).toBe(secondOptions);
      expect(config.getVersioning()).toBe(secondVersioning);
    });

    it("should work with complex real-world configuration", () => {
      const realWorldConfig = {
        prefix: "/api/v1",
        prefixOptions: {
          exclude: [
            {
              path: "/health",
              pathRegex: /^\/health$/,
              requestMethod: "GET" as any,
            },
            {
              path: "/metrics",
              pathRegex: /^\/metrics$/,
              requestMethod: "GET" as any,
            },
            {
              path: "/docs",
              pathRegex: /^\/docs.*$/,
              requestMethod: "GET" as any,
            },
          ],
        } as GlobalPrefixOptions<ExcludeRouteMetadata>,
        versioning: {
          type: HttpVersioningType.HEADER,
          header: "X-API-Version",
          defaultVersion: ["1.0", "1.1", "2.0"],
        } as VersioningOptions,
      };

      config.setGlobalPrefix(realWorldConfig.prefix);
      config.setGlobalPrefixOptions(realWorldConfig.prefixOptions);
      config.enableVersioning(realWorldConfig.versioning);

      expect(config.getGlobalPrefix()).toBe(realWorldConfig.prefix);
      expect(config.getGlobalPrefixOptions()).toEqual(realWorldConfig.prefixOptions);
      expect(config.getVersioning()).toEqual(realWorldConfig.versioning);
    });
  });

  describe("Type Safety Tests", () => {
    it("should maintain generic type constraint for adapter", () => {
      interface CustomAdapter extends AbstractHttpAdapter {
        customMethod(): void;
      }

      const customAdapter = {
        customMethod: mock(() => {}),
        listen: mock(() => {}),
        close: mock(() => {}),
      } as unknown as CustomAdapter;

      const customOptions: Required<HttpAppOptions> = {
        port: 3000,
        hostname: "localhost",
        listenCallback: mock(() => Promise.resolve()),
        callback: mock(() => {}),
        adapter: customAdapter,
      };

      const typedConfig = new HttpConfig<CustomAdapter>(customOptions);
      const retrievedAdapter = typedConfig.getHttpAdapterRef();
      
      expect(retrievedAdapter).toBe(customAdapter);
      expect(retrievedAdapter.customMethod).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle null and undefined values gracefully", () => {
      config.setGlobalPrefix("");
      expect(config.getGlobalPrefix()).toBe("");

      const emptyOptions: GlobalPrefixOptions<ExcludeRouteMetadata> = {};
      config.setGlobalPrefixOptions(emptyOptions);
      expect(config.getGlobalPrefixOptions()).toEqual({});
    });

    it("should handle versioning with VERSION_NEUTRAL", () => {
      const VERSION_NEUTRAL = Symbol("VERSION_NEUTRAL");
      const versioningOptions: VersioningOptions = {
        type: HttpVersioningType.HEADER,
        header: "Version",
        defaultVersion: [VERSION_NEUTRAL as any, "1.0"],
      };

      config.enableVersioning(versioningOptions);
      // @ts-expect-error Mismatch types
      expect(config.getVersioning()?.defaultVersion).toEqual([VERSION_NEUTRAL, "1.0"]);
    });

    it("should preserve reference equality for objects", () => {
      const prefixOptions: GlobalPrefixOptions<ExcludeRouteMetadata> = {
        exclude: [
          {
            path: "/test",
            pathRegex: /^\/test$/,
            requestMethod: "GET" as any,
          },
        ],
      };

      config.setGlobalPrefixOptions(prefixOptions);
      expect(config.getGlobalPrefixOptions()).toBe(prefixOptions);

      const versioningOptions: VersioningOptions = {
        type: HttpVersioningType.CUSTOM,
        extractor: mock(() => "1.0"),
      };

      config.enableVersioning(versioningOptions);
      expect(config.getVersioning()).toBe(versioningOptions);
    });
  });
});