import type { EventStreamsHost } from "~/interfaces/index.js";

import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import { ReplaySubject, Subject } from "rxjs";

import { SocketsContainer } from "~/websocket/container.js";

describe("SocketsContainer", () => {
  let container: SocketsContainer;
  let mockEventStreamsHost: EventStreamsHost;

  beforeEach(() => {
    container = new SocketsContainer();
    mockEventStreamsHost = {
      server: { id: "mock-server" },
      init: new ReplaySubject(1),
      connection: new Subject(),
      disconnect: new Subject(),
    };
  });

  describe("constructor", () => {
    it("should initialize with empty map", () => {
      expect((container as any).eventStreamsHosts).toBeInstanceOf(Map);
      expect((container as any).eventStreamsHosts.size).toBe(0);
    });
  });

  describe("getAll", () => {
    it("should return the internal map", () => {
      const allHosts = container.getAll();
      expect(allHosts).toBeInstanceOf(Map);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(allHosts).toBe((container as any).eventStreamsHosts);
    });

    it("should return empty map initially", () => {
      const allHosts = container.getAll();
      expect(allHosts.size).toBe(0);
    });

    it("should reflect changes in internal map", () => {
      const options = { port: 3000, path: "/" };
      container.add(options, mockEventStreamsHost);
      
      const allHosts = container.getAll();
      expect(allHosts.size).toBe(1);
    });
  });

  describe("generateHashByOptions", () => {
    const generateHash = (options: any) => (container as any).generateHashByOptions(options);

    it("should generate same hash for identical options", () => {
      const options1 = { port: 3000, path: "/" };
      const options2 = { port: 3000, path: "/" };
      
      const hash1 = generateHash(options1);
      const hash2 = generateHash(options2);
      
      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe("string");
    });

    it("should generate different hashes for different options", () => {
      const options1 = { port: 3000, path: "/" };
      const options2 = { port: 3001, path: "/" };
      
      const hash1 = generateHash(options1);
      const hash2 = generateHash(options2);
      
      expect(hash1).not.toBe(hash2);
    });

    it("should generate different hashes for different paths", () => {
      const options1 = { port: 3000, path: "/" };
      const options2 = { port: 3000, path: "/socket.io" };
      
      const hash1 = generateHash(options1);
      const hash2 = generateHash(options2);
      
      expect(hash1).not.toBe(hash2);
    });

    it("should generate different hashes for different namespaces", () => {
      const options1 = { port: 3000, path: "/", namespace: "chat" };
      const options2 = { port: 3000, path: "/", namespace: "notifications" };
      
      const hash1 = generateHash(options1);
      const hash2 = generateHash(options2);
      
      expect(hash1).not.toBe(hash2);
    });

    it("should handle complex nested options", () => {
      const options1 = {
        port: 3000,
        path: "/",
        namespace: "chat",
        cors: { origin: "*" },
        transports: ["websocket", "polling"],
      };
      const options2 = {
        port: 3000,
        path: "/",
        namespace: "chat",
        cors: { origin: "*" },
        transports: ["websocket", "polling"],
      };
      
      const hash1 = generateHash(options1);
      const hash2 = generateHash(options2);
      
      expect(hash1).toBe(hash2);
    });

    it("should generate consistent hashes for known properties", () => {
      const options1 = {
        port: 3000,
        path: "/",
        someUnknownProp: "value1",
      };
      const options2 = {
        port: 3000,
        path: "/",
        someUnknownProp: "value2",
      };
      
      // Different unknown properties should result in different hashes
      const hash1 = generateHash(options1);
      const hash2 = generateHash(options2);
      
      expect(hash1).not.toBe(hash2);
      expect(typeof hash1).toBe("string");
      expect(typeof hash2).toBe("string");
    });

    it("should handle empty options", () => {
      const hash = generateHash({});
      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should handle null/undefined values", () => {
      const options = {
        port: 3000,
        path: null,
        namespace: undefined,
      };
      
      const hash = generateHash(options);
      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe("add", () => {
    it("should add EventStreamsHost with simple options", () => {
      const options = { port: 3000, path: "/" };
      
      container.add(options, mockEventStreamsHost);
      
      const retrievedHost = container.get(options);
      expect(retrievedHost).toBe(mockEventStreamsHost);
    });

    it("should add EventStreamsHost with complex options", () => {
      const options = {
        port: 3000,
        path: "/socket.io",
        namespace: "chat",
        cors: { origin: "*" },
      };
      
      container.add(options, mockEventStreamsHost);
      
      const retrievedHost = container.get(options);
      expect(retrievedHost).toBe(mockEventStreamsHost);
    });

    it("should handle multiple EventStreamsHosts with different options", () => {
      const host1 = { ...mockEventStreamsHost, server: { id: "server1" } };
      const host2 = { ...mockEventStreamsHost, server: { id: "server2" } };
      
      const options1 = { port: 3000, path: "/" };
      const options2 = { port: 3001, path: "/" };
      
      container.add(options1, host1);
      container.add(options2, host2);
      
      expect(container.get(options1)).toBe(host1);
      expect(container.get(options2)).toBe(host2);
      expect(container.getAll().size).toBe(2);
    });

    it("should overwrite existing EventStreamsHost with same options", () => {
      const options = { port: 3000, path: "/" };
      const host1 = { ...mockEventStreamsHost, server: { id: "server1" } };
      const host2 = { ...mockEventStreamsHost, server: { id: "server2" } };
      
      container.add(options, host1);
      expect(container.get(options)).toBe(host1);
      
      container.add(options, host2);
      expect(container.get(options)).toBe(host2);
      expect(container.getAll().size).toBe(1);
    });

    it("should handle namespace options correctly", () => {
      const baseOptions = { port: 3000, path: "/" };
      const namespaceOptions = { port: 3000, path: "/", namespace: "chat" };
      
      const baseHost = { ...mockEventStreamsHost, server: { id: "base" } };
      const namespaceHost = { ...mockEventStreamsHost, server: { id: "namespace" } };
      
      container.add(baseOptions, baseHost);
      container.add(namespaceOptions, namespaceHost);
      
      expect(container.get(baseOptions)).toBe(baseHost);
      expect(container.get(namespaceOptions)).toBe(namespaceHost);
      expect(container.getAll().size).toBe(2);
    });

    it("should store hosts with hash keys in internal map", () => {
      const options = { port: 3000, path: "/" };
      container.add(options, mockEventStreamsHost);
      
      const internalMap = (container as any).eventStreamsHosts;
      expect(internalMap.size).toBe(1);
      
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const keys = Array.from(internalMap.keys());
      expect(typeof keys[0]).toBe("string");
      // @ts-expect-error Mismatch types
      expect(keys[0].length).toBeGreaterThan(0);
    });
  });

  describe("get", () => {
    beforeEach(() => {
      const options = { port: 3000, path: "/" };
      container.add(options, mockEventStreamsHost);
    });

    it("should retrieve EventStreamsHost with matching options", () => {
      const options = { port: 3000, path: "/" };
      const retrievedHost = container.get(options);
      
      expect(retrievedHost).toBe(mockEventStreamsHost);
    });

    it("should return undefined for non-existent options", () => {
      const options = { port: 9999, path: "/nonexistent" };
      const retrievedHost = container.get(options);
      
      expect(retrievedHost).toBeUndefined();
    });

    it("should handle exact option matching", () => {
      const exactOptions = { port: 3000, path: "/" };
      const similarOptions = { port: 3000, path: "/", extra: "prop" };
      
      // Should find with exact options
      expect(container.get(exactOptions)).toBe(mockEventStreamsHost);
      
      // Should not find with different hash due to extra property
      expect(container.get(similarOptions)).toBeUndefined();
    });

    it("should handle complex options retrieval", () => {
      const complexOptions = {
        port: 4000,
        path: "/socket.io",
        namespace: "admin",
        cors: { origin: "localhost:3000" },
      };
      const complexHost = { ...mockEventStreamsHost, server: { id: "complex" } };
      
      container.add(complexOptions, complexHost);
      
      const retrievedHost = container.get(complexOptions);
      expect(retrievedHost).toBe(complexHost);
    });

    it("should return different hosts for different namespaces", () => {
      const baseOptions = { port: 3000, path: "/" };
      const chatOptions = { port: 3000, path: "/", namespace: "chat" };
      const adminOptions = { port: 3000, path: "/", namespace: "admin" };
      
      const baseHost = { ...mockEventStreamsHost, server: { id: "base" } };
      const chatHost = { ...mockEventStreamsHost, server: { id: "chat" } };
      const adminHost = { ...mockEventStreamsHost, server: { id: "admin" } };
      
      container.add(baseOptions, baseHost);
      container.add(chatOptions, chatHost);
      container.add(adminOptions, adminHost);
      
      expect(container.get(baseOptions)).toBe(baseHost);
      expect(container.get(chatOptions)).toBe(chatHost);
      expect(container.get(adminOptions)).toBe(adminHost);
    });

    it("should handle options with null/undefined values", () => {
      const options = {
        port: 3000,
        path: null,
        namespace: undefined,
      };
      const hostWithNulls = { ...mockEventStreamsHost, server: { id: "null-test" } };
      
      container.add(options, hostWithNulls);
      
      const retrievedHost = container.get(options);
      expect(retrievedHost).toBe(hostWithNulls);
    });
  });

  describe("clear", () => {
    it("should clear all EventStreamsHosts", () => {
      const options1 = { port: 3000, path: "/" };
      const options2 = { port: 3001, path: "/" };
      const options3 = { port: 3000, path: "/", namespace: "chat" };
      
      container.add(options1, mockEventStreamsHost);
      container.add(options2, mockEventStreamsHost);
      container.add(options3, mockEventStreamsHost);
      
      expect(container.getAll().size).toBe(3);
      
      container.clear();
      
      expect(container.getAll().size).toBe(0);
      expect(container.get(options1)).toBeUndefined();
      expect(container.get(options2)).toBeUndefined();
      expect(container.get(options3)).toBeUndefined();
    });

    it("should allow adding hosts after clearing", () => {
      const options = { port: 3000, path: "/" };
      
      container.add(options, mockEventStreamsHost);
      expect(container.getAll().size).toBe(1);
      
      container.clear();
      expect(container.getAll().size).toBe(0);
      
      container.add(options, mockEventStreamsHost);
      expect(container.getAll().size).toBe(1);
      expect(container.get(options)).toBe(mockEventStreamsHost);
    });

    it("should clear empty container without issues", () => {
      expect(container.getAll().size).toBe(0);
      
      expect(() => container.clear()).not.toThrow();
      
      expect(container.getAll().size).toBe(0);
    });
  });

  describe("integration scenarios", () => {
    it("should handle typical WebSocket server scenarios", () => {
      // Main server
      const mainOptions = { port: 3000, path: "/socket.io" };
      const mainHost = { ...mockEventStreamsHost, server: { id: "main" } };
      
      // Chat namespace
      const chatOptions = { port: 3000, path: "/socket.io", namespace: "chat" };
      const chatHost = { ...mockEventStreamsHost, server: { id: "chat" } };
      
      // Admin namespace
      const adminOptions = { port: 3000, path: "/socket.io", namespace: "admin" };
      const adminHost = { ...mockEventStreamsHost, server: { id: "admin" } };
      
      // API server on different port
      const apiOptions = { port: 3001, path: "/api/ws" };
      const apiHost = { ...mockEventStreamsHost, server: { id: "api" } };
      
      container.add(mainOptions, mainHost);
      container.add(chatOptions, chatHost);
      container.add(adminOptions, adminHost);
      container.add(apiOptions, apiHost);
      
      // Verify all hosts are stored correctly
      expect(container.getAll().size).toBe(4);
      expect(container.get(mainOptions)).toBe(mainHost);
      expect(container.get(chatOptions)).toBe(chatHost);
      expect(container.get(adminOptions)).toBe(adminHost);
      expect(container.get(apiOptions)).toBe(apiHost);
    });

    it("should work with getOrCreateServer usage pattern", () => {
      // Simulating the actual usage in the provided code
      const basicOptions = { port: 3000, path: "/" };
      const namespaceOptions = { port: 3000, path: "/", namespace: "chat" };
      
      // First call - should not find existing server
      expect(container.get(basicOptions)).toBeUndefined();
      
      // Add basic server
      const basicHost = { ...mockEventStreamsHost, server: { id: "basic" } };
      container.add(basicOptions, basicHost);
      
      // Second call - should find existing server
      expect(container.get(basicOptions)).toBe(basicHost);
      
      // Check for namespace - should not exist yet
      expect(container.get(namespaceOptions)).toBeUndefined();
      
      // Add namespace
      const namespaceHost = { ...mockEventStreamsHost, server: { id: "namespace" } };
      container.add(namespaceOptions, namespaceHost);
      
      // Both should exist now
      expect(container.get(basicOptions)).toBe(basicHost);
      expect(container.get(namespaceOptions)).toBe(namespaceHost);
    });

    it("should handle multiple calls with same options efficiently", () => {
      const options = { port: 3000, path: "/" };
      
      // Mock hash generation to count calls
      const originalGenerate = (container as any).generateHashByOptions;
      const generateSpy = spyOn(container as any, "generateHashByOptions");
      generateSpy.mockImplementation(originalGenerate);
      
      container.add(options, mockEventStreamsHost);
      container.get(options);
      container.get(options);
      container.get(options);
      
      // Hash should be generated for add + each get
      expect(generateSpy).toHaveBeenCalledTimes(4);
      
      generateSpy.mockRestore();
    });
  });

  describe("edge cases", () => {
    it("should handle very large option objects", () => {
      const largeOptions = {
        port: 3000,
        path: "/",
        middleware: Array(1000).fill("middleware"),
        cors: {
          origin: Array(100).fill("origin"),
          methods: ["GET", "POST", "PUT", "DELETE"],
          credentials: true,
        },
        transports: ["websocket", "polling", "flashsocket"],
        pingTimeout: 60000,
        pingInterval: 25000,
      };
      
      expect(() => {
        container.add(largeOptions, mockEventStreamsHost);
        const retrieved = container.get(largeOptions);
        expect(retrieved).toBe(mockEventStreamsHost);
      }).not.toThrow();
    });

    it("should handle special characters in string options", () => {
      const specialOptions = {
        port: 3000,
        path: "/socket.io/特殊字符/emoji😀",
        namespace: "测试/namespace",
        customProp: "value with spaces and @#$%^&*()",
      };
      
      container.add(specialOptions, mockEventStreamsHost);
      const retrieved = container.get(specialOptions);
      expect(retrieved).toBe(mockEventStreamsHost);
    });

    it("should handle numeric string vs number differences", () => {
      const numericOptions = { port: 3000, timeout: 5000 };
      const stringOptions = { port: "3000", timeout: "5000" } as any;
      
      const numericHost = { ...mockEventStreamsHost, server: { id: "numeric" } };
      const stringHost = { ...mockEventStreamsHost, server: { id: "string" } };
      
      container.add(numericOptions, numericHost);
      container.add(stringOptions, stringHost);
      
      // These should be treated as different due to type difference
      expect(container.get(numericOptions)).toBe(numericHost);
      expect(container.get(stringOptions)).toBe(stringHost);
      expect(container.getAll().size).toBe(2);
    });

    it("should handle boolean values correctly", () => {
      const options = {
        port: 3000,
        enabled: true,
        secure: false,
        autoConnect: true,
      };
      
      container.add(options, mockEventStreamsHost);
      
      // Same options should retrieve the host
      const retrieved = container.get(options);
      expect(retrieved).toBe(mockEventStreamsHost);
      
      // Different boolean values should not match
      const differentBooleans = {
        port: 3000,
        enabled: false,  // Changed
        secure: false,
        autoConnect: true,
      };
      
      expect(container.get(differentBooleans)).toBeUndefined();
    });

    it("should handle array order sensitivity", () => {
      const options1 = {
        port: 3000,
        transports: ["websocket", "polling"],
      };
      const options2 = {
        port: 3000,
        transports: ["polling", "websocket"],  // Different order
      };
      
      const host1 = { ...mockEventStreamsHost, server: { id: "host1" } };
      const host2 = { ...mockEventStreamsHost, server: { id: "host2" } };
      
      container.add(options1, host1);
      container.add(options2, host2);
      
      // Different array orders should result in different hashes
      expect(container.get(options1)).toBe(host1);
      expect(container.get(options2)).toBe(host2);
      expect(container.getAll().size).toBe(2);
    });

    it("should handle deeply nested objects", () => {
      const deepOptions = {
        port: 3000,
        config: {
          level1: {
            level2: {
              level3: {
                value: "deep",
                array: [1, 2, { nested: "object" }],
              },
            },
          },
        },
      };
      
      container.add(deepOptions, mockEventStreamsHost);
      const retrieved = container.get(deepOptions);
      expect(retrieved).toBe(mockEventStreamsHost);
    });
  });

  describe("type safety", () => {
    it("should accept generic types for options", () => {
      interface CustomOptions {
        port: number;
        path: string;
        customProp: string;
      }
      
      const customOptions: CustomOptions = {
        port: 3000,
        path: "/custom",
        customProp: "value",
      };
      
      container.add<CustomOptions>(customOptions, mockEventStreamsHost);
      const retrieved = container.get<CustomOptions>(customOptions);
      
      expect(retrieved).toBe(mockEventStreamsHost);
    });

    it("should work with any record type", () => {
      const options: Record<string, any> = {
        port: 3000,
        dynamicProp: "dynamic",
        anotherProp: { nested: true },
      };
      
      container.add(options, mockEventStreamsHost);
      const retrieved = container.get(options);
      
      expect(retrieved).toBe(mockEventStreamsHost);
    });
  });
});