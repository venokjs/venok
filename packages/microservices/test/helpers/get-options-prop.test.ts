import { describe, expect, it } from "bun:test";
import { getOptionsProp } from "~/helpers/get-options-prop.helper.js";

describe("getOptionsProp", () => {
  describe("without default value", () => {
    it("should return property value when property exists", () => {
      const obj = { name: "test", age: 25, active: true };
      
      expect(getOptionsProp(obj, "name")).toBe("test");
      expect(getOptionsProp(obj, "age")).toBe(25);
      expect(getOptionsProp(obj, "active")).toBe(true);
    });

    it("should return undefined when property does not exist", () => {
      const obj = { name: "test" };
      
      expect(getOptionsProp(obj, "nonexistent" as any)).toBeUndefined();
    });

    it("should return undefined when object is null", () => {
      // @ts-expect-error Mismatch types
      expect(getOptionsProp(null, "name" as any)).toBeUndefined();
    });

    it("should return undefined when object is undefined", () => {
      // @ts-expect-error Mismatch types
      expect(getOptionsProp(undefined, "name" as any)).toBeUndefined();
    });

    it("should handle nested object properties", () => {
      const obj = { 
        config: { 
          database: { 
            host: "localhost", 
            port: 5432, 
          }, 
        }, 
      };
      
      expect(getOptionsProp(obj, "config")).toEqual({
        database: { 
          host: "localhost", 
          port: 5432, 
        },
      });
    });

    it("should handle falsy property values", () => {
      const obj = { 
        zero: 0, 
        empty: "", 
        nullValue: null, 
        false: false, 
      };
      
      expect(getOptionsProp(obj, "zero")).toBe(0);
      expect(getOptionsProp(obj, "empty")).toBe("");
      expect(getOptionsProp(obj, "nullValue")).toBeNull();
      expect(getOptionsProp(obj, "false")).toBe(false);
    });

    it("should work with symbol keys", () => {
      const symbol = Symbol("test");
      const obj = { [symbol]: "symbol value" };
      
      expect(getOptionsProp(obj, symbol as any)).toBe("symbol value");
    });

    it("should work with arrays", () => {
      const arr = ["first", "second", "third"];
      
      expect(getOptionsProp(arr, 0 as any)).toBe("first");
      expect(getOptionsProp(arr, 1 as any)).toBe("second");
      // @ts-expect-error Mismatch types
      expect(getOptionsProp(arr, "length" as any)).toBe(3);
    });

    it("should handle inherited properties", () => {
      class Parent {
        parentProp = "parent";
      }
      
      class Child extends Parent {
        childProp = "child";
      }
      
      const obj = new Child();
      
      expect(getOptionsProp(obj, "childProp" as any)).toBe("child");
      expect(getOptionsProp(obj, "parentProp" as any)).toBe("parent");
    });
  });

  describe("with default value", () => {
    it("should return property value when property exists", () => {
      const obj = { name: "test", age: 25 };
      
      expect(getOptionsProp(obj, "name", "default")).toBe("test");
      expect(getOptionsProp(obj, "age", 0)).toBe(25);
    });

    it("should return default value when property does not exist", () => {
      const obj = { name: "test" };
      
      expect(getOptionsProp(obj, "nonexistent" as any, "default")).toBe("default");
      expect(getOptionsProp(obj, "missing" as any, 42)).toBe(42);
    });

    it("should return default value when object is null", () => {
      // @ts-expect-error Mismatch types
      expect(getOptionsProp(null, "name" as any, "default")).toBe("default");
      // @ts-expect-error Mismatch types
      expect(getOptionsProp(null, "count" as any, 0)).toBe(0);
    });

    it("should return default value when object is undefined", () => {
      // @ts-expect-error Mismatch types
      expect(getOptionsProp(undefined, "name" as any, "default")).toBe("default");
      // @ts-expect-error Mismatch types
      expect(getOptionsProp(undefined, "active" as any, true)).toBe(true);
    });

    it("should handle complex default values", () => {
      const obj = {};
      const defaultArray = [1, 2, 3];
      const defaultObject = { nested: "value" };
      const defaultFunction = () => "result";

      // @ts-expect-error Mismatch types
      expect(getOptionsProp(obj, "array", defaultArray)).toBe(defaultArray);
      // @ts-expect-error Mismatch types
      expect(getOptionsProp(obj, "object", defaultObject)).toBe(defaultObject);
      // @ts-expect-error Mismatch types
      expect(getOptionsProp(obj, "function", defaultFunction)).toBe(defaultFunction);
    });

    it("should prefer property value over default even when property is falsy", () => {
      const obj = { 
        zero: 0, 
        empty: "", 
        nullValue: null, 
        false: false, 
      };
      
      expect(getOptionsProp(obj, "zero", 42)).toBe(0);
      expect(getOptionsProp(obj, "empty", "default")).toBe("");
      // @ts-expect-error Mismatch types
      expect(getOptionsProp(obj, "nullValue", "default")).toBeNull();
      expect(getOptionsProp(obj, "false", true)).toBe(false);
    });

    it("should handle null as default value", () => {
      const obj = {};

      // @ts-expect-error Mismatch types
      expect(getOptionsProp(obj, "missing", null)).toBeNull();
    });

    it("should handle undefined as explicit default value", () => {
      const obj = {};

      // @ts-expect-error Mismatch types
      expect(getOptionsProp(obj, "missing", undefined)).toBeUndefined();
    });

    it("should work with different data types as defaults", () => {
      const obj = {};
      const date = new Date();
      const regex = /test/;
      const map = new Map();
      const set = new Set();

      // @ts-expect-error Mismatch types
      expect(getOptionsProp(obj, "date", date)).toBe(date);
      // @ts-expect-error Mismatch types
      expect(getOptionsProp(obj, "regex", regex)).toBe(regex);
      // @ts-expect-error Mismatch types
      expect(getOptionsProp(obj, "map", map)).toBe(map);
      // @ts-expect-error Mismatch types
      expect(getOptionsProp(obj, "set", set)).toBe(set);
    });
  });

  describe("edge cases", () => {
    it("should handle empty object", () => {
      const obj = {};

      // @ts-expect-error Mismatch types
      expect(getOptionsProp(obj, "any")).toBeUndefined();
      // @ts-expect-error Mismatch types
      expect(getOptionsProp(obj, "any", "default")).toBe("default");
    });

    it("should handle object with prototype pollution attempt", () => {
      const obj = { __proto__: { malicious: "value" } };
      
      expect(getOptionsProp(obj, "__proto__" as any)).toEqual({ malicious: "value" });
      // The property is inherited through prototype chain, so it will be found
      expect(getOptionsProp(obj, "malicious" as any)).toBe("value");
    });

    it("should handle number keys", () => {
      const obj = { 0: "zero", 1: "one", 42: "answer" };
      
      expect(getOptionsProp(obj, 0 as any)).toBe("zero");
      expect(getOptionsProp(obj, 1 as any)).toBe("one");
      expect(getOptionsProp(obj, 42 as any)).toBe("answer");
    });

    it("should work with very large objects", () => {
      const largeObj: Record<string, number> = {};
      for (let i = 0; i < 1000; i++) {
        largeObj[`prop${i}`] = i;
      }
      
      expect(getOptionsProp(largeObj, "prop0")).toBe(0);
      expect(getOptionsProp(largeObj, "prop999")).toBe(999);
      expect(getOptionsProp(largeObj, "nonexistent" as any, -1)).toBe(-1);
    });

    it("should handle circular references in objects", () => {
      const obj: any = { name: "test" };
      obj.self = obj;
      
      expect(getOptionsProp(obj, "name")).toBe("test");
      expect(getOptionsProp(obj, "self")).toBe(obj);
    });

    it("should handle objects with getters", () => {
      const obj = {
        get dynamicValue() {
          return "computed";
        },
        normalValue: "static",
      };
      
      expect(getOptionsProp(obj, "dynamicValue" as any)).toBe("computed");
      expect(getOptionsProp(obj, "normalValue" as any)).toBe("static");
    });

    it("should handle frozen objects", () => {
      const obj = Object.freeze({ frozen: "value" });
      
      expect(getOptionsProp(obj, "frozen")).toBe("value");
      expect(getOptionsProp(obj, "missing" as any, "default")).toBe("default");
    });

    it("should handle sealed objects", () => {
      const obj = Object.seal({ sealed: "value" });
      
      expect(getOptionsProp(obj, "sealed")).toBe("value");
      expect(getOptionsProp(obj, "missing" as any, "default")).toBe("default");
    });
  });

  describe("type safety scenarios", () => {
    interface TestOptions {
      host?: string;
      port?: number;
      timeout?: number;
      ssl?: boolean;
    }

    it("should work with typed interfaces", () => {
      const options: TestOptions = { 
        host: "localhost", 
        port: 3000, 
      };
      
      expect(getOptionsProp(options, "host")).toBe("localhost");
      expect(getOptionsProp(options, "port")).toBe(3000);
      expect(getOptionsProp(options, "timeout")).toBeUndefined();
      expect(getOptionsProp(options, "ssl", true)).toBe(true);
    });

    it("should maintain correct type relationships", () => {
      const config = {
        database: {
          host: "localhost",
          port: 5432,
          credentials: {
            username: "user",
            password: "pass",
          },
        },
        cache: {
          enabled: true,
          ttl: 300,
        },
      };
      
      const dbConfig = getOptionsProp(config, "database");
      expect(dbConfig?.host).toBe("localhost");
      expect(dbConfig?.port).toBe(5432);
      
      const cacheConfig = getOptionsProp(config, "cache");
      expect(cacheConfig?.enabled).toBe(true);
      expect(cacheConfig?.ttl).toBe(300);
    });
  });
});