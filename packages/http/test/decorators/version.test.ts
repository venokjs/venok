/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, expect, it } from "bun:test";
import { Version } from "~/decorators/version.decorator.js";
import { VERSION_METADATA } from "~/constants.js";

describe("@Version", () => {
  it("should have KEY property", () => {
    expect(Version.KEY).toBeDefined();
    expect(typeof Version.KEY).toBe("string");
  });

  it("should enhance method with version metadata when string version provided", () => {
    class TestController {
      @Version("1.0")
      test() {}
    }

    const version = Reflect.getMetadata(Version.KEY, TestController.prototype.test);
    
    expect(version).toBe("1.0");
  });

  it("should enhance method with version metadata when number version provided", () => {
    class TestController {
      @Version("2")
      test() {}
    }

    const version = Reflect.getMetadata(Version.KEY, TestController.prototype.test);
    
    expect(version).toBe("2");
  });

  it("should enhance method with version metadata when Symbol version provided", () => {
    const versionSymbol = Symbol("v1");
    
    class TestController {
      // @ts-expect-error Mismatch types
      @Version(versionSymbol)
      test() {}
    }

    const version = Reflect.getMetadata(Version.KEY, TestController.prototype.test);
    
    expect(version).toBe(versionSymbol);
  });

  it("should enhance method with version metadata when array version provided", () => {
    class TestController {
      @Version(["1", "2", "3"])
      test() {}
    }

    const version = Reflect.getMetadata(Version.KEY, TestController.prototype.test);
    
    expect(version).toEqual(["1", "2", "3"]);
  });

  it("should remove duplicates from array versions", () => {
    class TestController {
      @Version(["1", "2", "1", "3", "2"])
      test() {}
    }

    const version = Reflect.getMetadata(Version.KEY, TestController.prototype.test);
    
    expect(version).toEqual(["1", "2", "3"]);
  });

  it("should handle empty array", () => {
    class TestController {
      @Version([])
      test() {}
    }

    const version = Reflect.getMetadata(Version.KEY, TestController.prototype.test);
    
    expect(version).toEqual([]);
  });

  it("should handle array with single version", () => {
    class TestController {
      @Version(["1.0"])
      test() {}
    }

    const version = Reflect.getMetadata(Version.KEY, TestController.prototype.test);
    
    expect(version).toEqual(["1.0"]);
  });

  it("should handle mixed array types", () => {
    const symbolVersion = Symbol("v2");
    
    class TestController {
      // @ts-expect-error Mismatch types
      @Version(["1", symbolVersion, "3"])
      test() {}
    }

    const version = Reflect.getMetadata(Version.KEY, TestController.prototype.test);
    
    expect(version).toEqual(["1", symbolVersion, "3"]);
  });

  it("should handle semantic version strings", () => {
    class TestController {
      @Version("1.2.3")
      test() {}
    }

    const version = Reflect.getMetadata(Version.KEY, TestController.prototype.test);
    
    expect(version).toBe("1.2.3");
  });

  it("should handle pre-release version strings", () => {
    class TestController {
      @Version("1.0.0-alpha.1")
      test() {}
    }

    const version = Reflect.getMetadata(Version.KEY, TestController.prototype.test);
    
    expect(version).toBe("1.0.0-alpha.1");
  });

  it("should handle version with build metadata", () => {
    class TestController {
      @Version("1.0.0+build.1")
      test() {}
    }

    const version = Reflect.getMetadata(Version.KEY, TestController.prototype.test);
    
    expect(version).toBe("1.0.0+build.1");
  });

  it("should preserve original method functionality", () => {
    class TestController {
      @Version("1.0")
      test() {
        return "test result";
      }
    }

    const controller = new TestController();
    expect(controller.test()).toBe("test result");
  });

  it("should work with async methods", () => {
    class TestController {
      @Version("2.0")
      async test() {
        return Promise.resolve("async result");
      }
    }

    const version = Reflect.getMetadata(Version.KEY, TestController.prototype.test);
    expect(version).toBe("2.0");
    
    const controller = new TestController();
    expect(controller.test()).toBeInstanceOf(Promise);
  });

  it("should work with methods that have parameters", () => {
    class TestController {
      @Version("1.5")
      test(param1: string, param2: number) {
        return `${param1}-${param2}`;
      }
    }

    const version = Reflect.getMetadata(Version.KEY, TestController.prototype.test);
    expect(version).toBe("1.5");
    
    const controller = new TestController();
    expect(controller.test("hello", 123)).toBe("hello-123");
  });

  it("should handle different methods with different versions", () => {
    class TestController {
      @Version("1.0")
      method1() {}

      @Version("2.0")
      method2() {}

      @Version(["1.0", "2.0"])
      method3() {}
    }

    const version1 = Reflect.getMetadata(Version.KEY, TestController.prototype.method1);
    const version2 = Reflect.getMetadata(Version.KEY, TestController.prototype.method2);
    const version3 = Reflect.getMetadata(Version.KEY, TestController.prototype.method3);
    
    expect(version1).toBe("1.0");
    expect(version2).toBe("2.0");
    expect(version3).toEqual(["1.0", "2.0"]);
  });

  it("should handle complex array deduplication", () => {
    const symbol1 = Symbol("v1");
    const symbol2 = Symbol("v2");
    
    class TestController {
      // @ts-expect-error Mismatch types
      @Version(["1", symbol1, "2", "1", symbol2, symbol1, "3"])
      test() {}
    }

    const version = Reflect.getMetadata(Version.KEY, TestController.prototype.test);
    
    expect(version).toEqual(["1", symbol1, "2", symbol2, "3"]);
  });

  it("should handle null and undefined gracefully", () => {
    class TestController {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      @Version(null as any)
      testNull() {}

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      @Version(undefined as any)
      testUndefined() {}
    }

    const versionNull = Reflect.getMetadata(Version.KEY, TestController.prototype.testNull);
    const versionUndefined = Reflect.getMetadata(Version.KEY, TestController.prototype.testUndefined);
    
    // Version decorator will store the transformed value, null/undefined may not be stored
    expect(versionNull === null || versionNull === undefined).toBe(true);
    expect(versionUndefined === null || versionUndefined === undefined).toBe(true);
  });

  it("should handle zero and empty string versions", () => {
    class TestController {
      @Version("0")
      testZero() {}

      @Version("")
      testEmpty() {}
    }

    const versionZero = Reflect.getMetadata(Version.KEY, TestController.prototype.testZero);
    const versionEmpty = Reflect.getMetadata(Version.KEY, TestController.prototype.testEmpty);
    
    expect(versionZero).toBe("0");
    expect(versionEmpty).toBe("");
  });

  it("should only apply to methods, not classes", () => {
    class TestController {
      @Version("1.0")
      test() {}
    }

    const classMetadata = Reflect.getMetadata(Version.KEY, TestController);
    expect(classMetadata).toBeUndefined();
    
    const methodMetadata = Reflect.getMetadata(Version.KEY, TestController.prototype.test);
    expect(methodMetadata).toBe("1.0");
  });

  it("should handle array with duplicate symbols correctly", () => {
    const symbol1 = Symbol("v1");
    const symbol2 = Symbol("v1"); // Different symbol with same description
    
    class TestController {
      // @ts-expect-error Mismatch types
      @Version([symbol1, symbol2, symbol1])
      test() {}
    }

    const version = Reflect.getMetadata(Version.KEY, TestController.prototype.test);
    
    // Should keep both symbols as they are different objects
    expect(version).toHaveLength(2);
    expect(version).toContain(symbol1);
    expect(version).toContain(symbol2);
  });
});