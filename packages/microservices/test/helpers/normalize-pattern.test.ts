import { describe, expect, it } from "bun:test";

import { normalizePattern } from "~/helpers/normalize-pattern.helper.js";

describe("normalizePattern", () => {
  describe("string patterns", () => {
    it("should return string pattern as is", () => {
      const pattern = "test-pattern";
      const result = normalizePattern(pattern);
      
      expect(result).toBe("test-pattern");
    });

    it("should handle empty string pattern", () => {
      const pattern = "";
      const result = normalizePattern(pattern);
      
      expect(result).toBe("");
    });

    it("should handle string with special characters", () => {
      const pattern = "user:profile:update";
      const result = normalizePattern(pattern);
      
      expect(result).toBe("user:profile:update");
    });

    it("should handle string with numbers", () => {
      const pattern = "api-v1-users";
      const result = normalizePattern(pattern);
      
      expect(result).toBe("api-v1-users");
    });

    it("should handle string with spaces", () => {
      const pattern = "user profile";
      const result = normalizePattern(pattern);
      
      expect(result).toBe("user profile");
    });
  });

  describe("number patterns", () => {
    it("should convert positive integer to string", () => {
      const pattern = 123;
      const result = normalizePattern(pattern);
      
      expect(result).toBe("123");
    });

    it("should convert negative integer to string", () => {
      const pattern = -456;
      const result = normalizePattern(pattern);
      
      expect(result).toBe("-456");
    });

    it("should convert zero to string", () => {
      const pattern = 0;
      const result = normalizePattern(pattern);
      
      expect(result).toBe("0");
    });

    it("should convert float to string", () => {
      const pattern = 123.456;
      const result = normalizePattern(pattern);
      
      expect(result).toBe("123.456");
    });

    it("should handle very large numbers", () => {
      const pattern = Number.MAX_SAFE_INTEGER;
      const result = normalizePattern(pattern);
      
      expect(result).toBe(String(Number.MAX_SAFE_INTEGER));
    });
  });

  describe("simple object patterns", () => {
    it("should normalize object with single string property", () => {
      const pattern = { cmd: "get-user" };
      const result = normalizePattern(pattern);
      
      expect(result).toBe('{"cmd":"get-user"}');
    });

    it("should normalize object with single number property", () => {
      const pattern = { version: 1 };
      const result = normalizePattern(pattern);
      
      expect(result).toBe('{"version":1}');
    });

    it("should normalize object with multiple properties in sorted order", () => {
      const pattern = { cmd: "get-user", version: 2 };
      const result = normalizePattern(pattern);
      
      expect(result).toBe('{"cmd":"get-user","version":2}');
    });

    it("should sort properties alphabetically", () => {
      const pattern = { zebra: "z", apple: "a", banana: "b" };
      const result = normalizePattern(pattern);
      
      expect(result).toBe('{"apple":"a","banana":"b","zebra":"z"}');
    });

    it("should handle empty object", () => {
      const pattern = {};
      const result = normalizePattern(pattern);
      
      expect(result).toBe("{}");
    });
  });

  describe("nested object patterns", () => {
    it("should normalize nested object with string values", () => {
      const pattern = { 
        cmd: "get-user", 
        params: { id: "123" }, 
      };
      const result = normalizePattern(pattern);
      
      expect(result).toBe('{"cmd":"get-user","params":{"id":"123"}}');
    });

    it("should normalize nested object with number values", () => {
      const pattern = { 
        cmd: "get-user", 
        params: { id: 123 }, 
      };
      const result = normalizePattern(pattern);
      
      expect(result).toBe('{"cmd":"get-user","params":{"id":123}}');
    });

    it("should normalize deeply nested objects", () => {
      const pattern = {
        service: "user",
        operation: {
          type: "query",
          details: {
            field: "email",
            operator: "equals",
          },
        },
      };
      const result = normalizePattern(pattern);
      
      expect(result).toBe('{"operation":{"details":{"field":"email","operator":"equals"},"type":"query"},"service":"user"}');
    });

    it("should handle nested object with mixed property order", () => {
      const pattern = {
        zebra: { beta: "b", alpha: "a" },
        alpha: { gamma: "g", beta: "b" },
      };
      const result = normalizePattern(pattern);
      
      expect(result).toBe('{"alpha":{"beta":"b","gamma":"g"},"zebra":{"alpha":"a","beta":"b"}}');
    });
  });

  describe("complex nested structures", () => {
    it("should normalize object with mixed types at different levels", () => {
      const pattern = {
        cmd: "process-order",
        version: 2,
        params: {
          orderId: "order-123",
          userId: 456,
          metadata: {
            source: "web",
            priority: 1,
          },
        },
      };
      const result = normalizePattern(pattern);
      
      expect(result).toBe('{"cmd":"process-order","params":{"metadata":{"priority":1,"source":"web"},"orderId":"order-123","userId":456},"version":2}');
    });

    it("should handle three levels of nesting", () => {
      const pattern = {
        level1: {
          level2: {
            level3: {
              value: "deep",
            },
          },
        },
      };
      const result = normalizePattern(pattern);
      
      expect(result).toBe('{"level1":{"level2":{"level3":{"value":"deep"}}}}');
    });

    it("should maintain consistency with identical objects", () => {
      const pattern1 = { b: "2", a: "1" };
      const pattern2 = { a: "1", b: "2" };
      const result1 = normalizePattern(pattern1);
      const result2 = normalizePattern(pattern2);
      
      expect(result1).toBe(result2);
      expect(result1).toBe('{"a":"1","b":"2"}');
    });
  });

  describe("property key edge cases", () => {
    it("should handle numeric string keys", () => {
      const pattern = { 123: "value", 456: "other" };
      const result = normalizePattern(pattern);
      
      expect(result).toBe('{"123":"value","456":"other"}');
    });

    it("should handle keys with special characters", () => {
      const pattern = { "user-id": "123", user_name: "john" };
      const result = normalizePattern(pattern);
      
      expect(result).toBe('{"user_name":"john","user-id":"123"}');
    });

    it("should handle keys with spaces", () => {
      const pattern = { "user id": "123", "user name": "john" };
      const result = normalizePattern(pattern);
      
      expect(result).toBe('{"user id":"123","user name":"john"}');
    });

    it("should sort keys correctly with different cases", () => {
      const pattern = { ZZZ: "z", aaa: "a", BBB: "b" };
      const result = normalizePattern(pattern);
      
      expect(result).toBe('{"aaa":"a","BBB":"b","ZZZ":"z"}');
    });
  });

  describe("value edge cases", () => {
    it("should handle string values with quotes", () => {
      const pattern = { message: 'Hello "World"' };
      const result = normalizePattern(pattern);
      
      expect(result).toBe('{"message":"Hello "World""}');
    });

    it("should handle string values with single quotes", () => {
      const pattern = { message: "Hello 'World'" };
      const result = normalizePattern(pattern);
      
      expect(result).toBe('{"message":"Hello \'World\'"}');
    });

    it("should handle zero values", () => {
      const pattern = { count: 0, amount: "0" };
      const result = normalizePattern(pattern);
      
      expect(result).toBe('{"amount":"0","count":0}');
    });

    it("should handle negative number values", () => {
      const pattern = { temperature: -10, debt: -250.50 };
      const result = normalizePattern(pattern);
      
      expect(result).toBe('{"debt":-250.5,"temperature":-10}');
    });
  });

  describe("real-world usage patterns", () => {
    it("should normalize microservice command pattern", () => {
      const pattern = {
        service: "user-service",
        cmd: "get-user-profile",
        version: 1,
      };
      const result = normalizePattern(pattern);
      
      expect(result).toBe('{"cmd":"get-user-profile","service":"user-service","version":1}');
    });

    it("should normalize event pattern", () => {
      const pattern = {
        event: "user.created",
        source: "auth-service",
        timestamp: 1234567890,
      };
      const result = normalizePattern(pattern);
      
      expect(result).toBe('{"event":"user.created","source":"auth-service","timestamp":1234567890}');
    });

    it("should normalize RPC pattern with nested parameters", () => {
      const pattern = {
        method: "updateUser",
        params: {
          userId: "usr_123",
          data: {
            email: "new@example.com",
            active: 1,
          },
        },
      };
      const result = normalizePattern(pattern);
      
      expect(result).toBe('{"method":"updateUser","params":{"data":{"active":1,"email":"new@example.com"},"userId":"usr_123"}}');
    });

    it("should normalize queue pattern", () => {
      const pattern = {
        queue: "email-notifications",
        priority: "high",
        retry: 3,
      };
      const result = normalizePattern(pattern);
      
      expect(result).toBe('{"priority":"high","queue":"email-notifications","retry":3}');
    });

    it("should be consistent for patterns used in different orders", () => {
      // Simulating the same pattern defined in different orders in different places
      const serverPattern = {
        service: "payment",
        method: "process",
        version: 2,
      };
      
      const clientPattern = {
        version: 2,
        method: "process",
        service: "payment",
      };
      
      const serverResult = normalizePattern(serverPattern);
      const clientResult = normalizePattern(clientPattern);
      
      expect(serverResult).toBe(clientResult);
      expect(serverResult).toBe('{"method":"process","service":"payment","version":2}');
    });
  });

  describe("performance and stability", () => {
    it("should handle patterns with many properties", () => {
      const pattern: any = {};
      for (let i = 0; i < 100; i++) {
        pattern[`key${i.toString().padStart(3, "0")}`] = `value${i}`;
      }
      
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = normalizePattern(pattern);
      
      expect(result).toMatch(/^\{.*\}$/);
      expect(result).toContain('"key000":"value0"');
      expect(result).toContain('"key099":"value99"');
    });

    it("should be deterministic for same input", () => {
      const pattern = {
        z: "last",
        a: "first", 
        m: { nested: "middle", other: "value" },
      };
      
      const result1 = normalizePattern(pattern);
      const result2 = normalizePattern(pattern);
      const result3 = normalizePattern(pattern);
      
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    it("should handle deeply nested structures without issues", () => {
      let pattern: any = { root: "value" };
      for (let i = 0; i < 10; i++) {
        pattern = { level: i, nested: pattern };
      }
      
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = normalizePattern(pattern);
      
      expect(result).toMatch(/^\{.*\}$/);
      expect(result).toContain('"root":"value"');
    });
  });
});