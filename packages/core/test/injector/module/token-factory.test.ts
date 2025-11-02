import { beforeEach, describe, expect, it, spyOn } from "bun:test";

import { TokenFactory } from "~/injector/module/token-factory.js";
import { Injectable } from "~/decorators/injectable.decorator.js";

describe("TokenFactory", () => {
  let tokenFactory: TokenFactory;

  @Injectable()
  class TestModule {}

  @Injectable()
  class AnotherModule {}

  class AnonymousClass {}

  beforeEach(() => {
    tokenFactory = new TokenFactory();
  });

  describe("create", () => {
    it("should create static token for module without dynamic metadata", () => {
      const token = tokenFactory.create(TestModule);

      expect(typeof token).toBe("string");
      expect(token.length).toBe(64); // SHA256 hash length
    });

    it("should create dynamic token for module with dynamic metadata", () => {
      const dynamicMetadata = {
        providers: ["provider1", "provider2"],
        imports: ["import1"],
      };

      // @ts-expect-error Mismatch types
      const token = tokenFactory.create(TestModule, dynamicMetadata);

      expect(typeof token).toBe("string");
      expect(token.length).toBe(64); // SHA256 hash length
    });

    it("should create different tokens for same module with different dynamic metadata", () => {
      const metadata1 = { providers: ["provider1"] };
      const metadata2 = { providers: ["provider2"] };

      // @ts-expect-error Mismatch types
      const token1 = tokenFactory.create(TestModule, metadata1);
      // @ts-expect-error Mismatch types
      const token2 = tokenFactory.create(TestModule, metadata2);

      expect(token1).not.toBe(token2);
    });

    it("should create same tokens for same module without dynamic metadata", () => {
      const token1 = tokenFactory.create(TestModule);
      const token2 = tokenFactory.create(TestModule);

      expect(token1).toBe(token2);
    });

    it("should create different tokens for different modules", () => {
      const token1 = tokenFactory.create(TestModule);
      const token2 = tokenFactory.create(AnotherModule);

      expect(token1).not.toBe(token2);
    });
  });

  describe("getStaticModuleToken", () => {
    it("should return hash for moduleId and moduleName", () => {
      const token = tokenFactory.getStaticModuleToken("test-id", "TestModule");

      expect(typeof token).toBe("string");
      expect(token.length).toBe(64); // SHA256 hash length
    });

    it("should cache tokens for same moduleId and moduleName", () => {
      const token1 = tokenFactory.getStaticModuleToken("test-id", "TestModule");
      const token2 = tokenFactory.getStaticModuleToken("test-id", "TestModule");

      expect(token1).toBe(token2);
    });

    it("should return different tokens for different moduleId", () => {
      const token1 = tokenFactory.getStaticModuleToken("test-id-1", "TestModule");
      const token2 = tokenFactory.getStaticModuleToken("test-id-2", "TestModule");

      expect(token1).not.toBe(token2);
    });

    it("should return different tokens for different moduleName", () => {
      const token1 = tokenFactory.getStaticModuleToken("test-id", "TestModule1");
      const token2 = tokenFactory.getStaticModuleToken("test-id", "TestModule2");

      expect(token1).not.toBe(token2);
    });
  });

  describe("getStringifiedOpaqueToken", () => {
    it("should stringify object with replacer function", () => {
      const opaqueToken = {
        id: "test-id",
        module: "TestModule",
        dynamic: { providers: [TestModule] },
      };

      const result = tokenFactory.getStringifiedOpaqueToken(opaqueToken);

      expect(typeof result).toBe("string");
      expect(result).toContain("test-id");
      expect(result).toContain("TestModule");
    });

    it("should return empty string for undefined token", () => {
      const result = tokenFactory.getStringifiedOpaqueToken(undefined);

      expect(result).toBe("");
    });

    it("should handle functions in object using replacer", () => {
      const functionValue = function namedFunction() {};
      const opaqueToken = {
        func: functionValue,
      };

      const result = tokenFactory.getStringifiedOpaqueToken(opaqueToken);

      expect(result).toContain("namedFunction");
    });

    it("should handle class functions in object using replacer", () => {
      const opaqueToken = {
        classValue: TestModule,
      };

      const result = tokenFactory.getStringifiedOpaqueToken(opaqueToken);

      expect(result).toContain("TestModule");
    });

    it("should handle symbols in object using replacer", () => {
      const symbolValue = Symbol("test-symbol");
      const opaqueToken = {
        symbol: symbolValue,
      };

      const result = tokenFactory.getStringifiedOpaqueToken(opaqueToken);

      expect(result).toContain("Symbol(test-symbol)");
    });

    it("should handle circular references safely", () => {
      const opaqueToken: any = { name: "test" };
      opaqueToken.circular = opaqueToken;

      // Should not throw error due to circular reference
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(() => tokenFactory.getStringifiedOpaqueToken(opaqueToken)).not.toThrow();
    });
  });

  describe("getModuleId", () => {
    it("should generate and cache module ID", () => {
      const id1 = tokenFactory.getModuleId(TestModule);
      const id2 = tokenFactory.getModuleId(TestModule);

      expect(typeof id1).toBe("string");
      expect(id1).toBe(id2); // Should be cached
    });

    it("should generate different IDs for different modules", () => {
      const id1 = tokenFactory.getModuleId(TestModule);
      const id2 = tokenFactory.getModuleId(AnotherModule);

      expect(id1).not.toBe(id2);
    });

    it("should generate random string ID", () => {
      const id = tokenFactory.getModuleId(TestModule);

      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    });
  });

  describe("getModuleName", () => {
    it("should return module constructor name", () => {
      const name = tokenFactory.getModuleName(TestModule);

      expect(name).toBe("TestModule");
    });

    it("should return name for anonymous class", () => {
      const name = tokenFactory.getModuleName(AnonymousClass);

      expect(name).toBe("AnonymousClass");
    });

    it("should handle class without explicit name", () => {
      const DynamicClass = class {};
      const name = tokenFactory.getModuleName(DynamicClass);

      expect(typeof name).toBe("string");
    });
  });

  describe("replacer function", () => {
    it("should convert class functions to their names", () => {
      const replacer = (tokenFactory as any).replacer;
      const result = replacer("key", TestModule);

      expect(result).toBe("TestModule");
    });

    it("should convert regular functions to their string representation", () => {
      const replacer = (tokenFactory as any).replacer;
      const func = function testFunction() { return "test"; };
      const result = replacer("key", func);

      expect(result).toContain("testFunction");
      expect(result).toContain("return \"test\"");
    });

    it("should convert arrow functions to their string representation", () => {
      const replacer = (tokenFactory as any).replacer;
      const arrowFunc = () => "test";
      const result = replacer("key", arrowFunc);

      expect(result).toContain("=>");
    });

    it("should convert symbols to their string representation", () => {
      const replacer = (tokenFactory as any).replacer;
      const symbol = Symbol("test-symbol");
      const result = replacer("key", symbol);

      expect(result).toBe("Symbol(test-symbol)");
    });

    it("should return other values unchanged", () => {
      const replacer = (tokenFactory as any).replacer;

      expect(replacer("key", "string")).toBe("string");
      expect(replacer("key", 123)).toBe(123);
      expect(replacer("key", true)).toBe(true);
      expect(replacer("key", null)).toBe(null);
      expect(replacer("key", undefined)).toBe(undefined);
    });

    it("should handle anonymous functions", () => {
      const replacer = (tokenFactory as any).replacer;
      const anonymousFunc = function () { return "anonymous"; };
      const result = replacer("key", anonymousFunc);

      expect(result).toContain("function");
      expect(result).toContain("return \"anonymous\"");
    });
  });

  describe("hashString", () => {
    it("should generate consistent SHA256 hash", () => {
      const hashString = (tokenFactory as any).hashString.bind(tokenFactory);
      const hash1 = hashString("test-string");
      const hash2 = hashString("test-string");

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // SHA256 hex length
    });

    it("should generate different hashes for different strings", () => {
      const hashString = (tokenFactory as any).hashString.bind(tokenFactory);
      const hash1 = hashString("string1");
      const hash2 = hashString("string2");

      expect(hash1).not.toBe(hash2);
    });

    it("should handle empty string", () => {
      const hashString = (tokenFactory as any).hashString.bind(tokenFactory);
      const hash = hashString("");

      expect(typeof hash).toBe("string");
      expect(hash.length).toBe(64);
    });
  });

  describe("cache behavior", () => {
    it("should use cache for static module tokens", () => {
      const hashStringSpy = spyOn(tokenFactory as any, "hashString").mockReturnValue("mocked-hash");

      const token1 = tokenFactory.getStaticModuleToken("test-id", "TestModule");
      const token2 = tokenFactory.getStaticModuleToken("test-id", "TestModule");

      expect(token1).toBe(token2);
      expect(hashStringSpy).toHaveBeenCalledTimes(1); // Should use cache on second call
    });

    it("should use cache for module IDs", () => {
      // First call should generate and cache
      const id1 = tokenFactory.getModuleId(TestModule);
      
      // Second call should use cache
      const id2 = tokenFactory.getModuleId(TestModule);

      expect(id1).toBe(id2);
    });
  });
});