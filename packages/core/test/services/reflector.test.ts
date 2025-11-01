import { beforeEach, describe, expect, it } from "bun:test";
import { Reflector } from "~/services/reflector.service.js";

const transformDecorator = Reflector.createDecorator<string[], number>({
  transform: value => value.length,
});

type TestObject = {
  only1?: string;
  only2?: string;
  both: string;
};

describe("Reflector", () => {
  const key = "key";
  let reflector: Reflector;

  @transformDecorator(["a", "b", "c"])
  class TestTransform {}
  class Test1 {}
  class Test2 {}

  beforeEach(() => {
    Reflect.deleteMetadata(key, Test1);
    Reflect.deleteMetadata(key, Test2);
    reflector = new Reflector();
  });

  describe("get", () => {
    it("should reflect metadata by key", () => {
      const value = "value";
      Reflect.defineMetadata(key, value, Test1);
      // @ts-expect-error Mismatch types
      expect(reflector.get(key, Test1)).toEqual(value);
    });

    it("should reflect metadata by decorator", () => {
      const decorator = Reflector.createDecorator<string>();
      const value = "value";
      Reflect.defineMetadata(decorator.KEY, value, Test1);

      // string
      let reflectedValue = reflector.get(decorator, Test1);
      expect(reflectedValue).toEqual(value);

      // @ts-expect-error 'value' is not assignable to parameter of type 'string'
      reflectedValue = true;

      reflectedValue satisfies string;
    });

    it("should reflect metadata by decorator (custom key)", () => {
      const decorator = Reflector.createDecorator<string[]>({ key: "custom" });
      const value = ["value"];
      Reflect.defineMetadata("custom", value, Test1);

      // string[]
      let reflectedValue = reflector.get(decorator, Test1);
      expect(reflectedValue).toEqual(value);

      // @ts-expect-error 'value' is not assignable to parameter of type 'string[]'
      reflectedValue = true;

      reflectedValue satisfies string[];
    });

    it("should reflect metadata by decorator (with transform option)", () => {
      let reflectedValue = reflector.get(transformDecorator, TestTransform);
      expect(reflectedValue).toEqual(3);

      // @ts-expect-error 'value' is not assignable to type 'number'
      reflectedValue = [];

      reflectedValue satisfies number;
    });
  });

  describe("getAll", () => {
    it("should reflect metadata of all targets by key", () => {
      const value1 = "value1";
      const value2 = "value2";
      Reflect.defineMetadata(key, value1, Test1);
      Reflect.defineMetadata(key, value2, Test2);
      expect(reflector.getAll(key, [Test1, Test2])).toEqual([value1, value2]);
    });
    it("should reflect metadata of all targets by decorator", () => {
      const decorator = Reflector.createDecorator<string>();
      const value1 = "value1";
      const value2 = "value2";
      Reflect.defineMetadata(decorator.KEY, value1, Test1);
      Reflect.defineMetadata(decorator.KEY, value2, Test2);

      // string[]
      const reflectedValue = reflector.getAll(decorator, [Test1, Test2]);
      expect(reflectedValue).toEqual([value1, value2]);

      reflectedValue satisfies string[];
    });
  });

  describe("getAllAndMerge", () => {
    it("should return an empty array when there are no targets", () => {
      expect(reflector.getAllAndMerge(key, [])).toEqual([]);
    });
    it("should reflect metadata of all targets and concat arrays", () => {
      const decorator = Reflector.createDecorator<string[]>();
      const value = "value";
      Reflect.defineMetadata(decorator.KEY, [value], Test1);

      // string[]
      const reflectedValue = reflector.getAllAndMerge(decorator, [
        Test1,
        Test1,
      ]);
      expect(reflectedValue).toEqual([value, value]);

      reflectedValue satisfies string[];
    });
    it("should reflect metadata of all targets and concat boolean arrays", () => {
      const decorator = Reflector.createDecorator<boolean>();
      const value = true;
      Reflect.defineMetadata(decorator.KEY, [value], Test1);

      // string[]
      const reflectedValue = reflector.getAllAndMerge(decorator, [
        Test1,
        Test1,
      ]);
      // @ts-expect-error Mismatch types
      expect(reflectedValue).toEqual([value, value]);
    });
    it("should reflect metadata of all targets and create an array", () => {
      const decorator = Reflector.createDecorator<string>();
      const value = "value";
      Reflect.defineMetadata(decorator.KEY, value, Test1);

      // string[]
      const reflectedValue = reflector.getAllAndMerge(decorator, [
        Test1,
        Test1,
      ]);
      // @ts-expect-error Mismatch types
      expect(reflectedValue).toEqual([value, value]);
    });
    it("should reflect metadata of all targets and merge objects", () => {
      const decorator = Reflector.createDecorator<TestObject>();
      const value1: TestObject = { only1: "test1", both: "overriden" };
      const value2: TestObject = { only2: "test2", both: "test" };
      Reflect.defineMetadata(decorator.KEY, value1, Test1);
      Reflect.defineMetadata(decorator.KEY, value2, Test2);

      // TestObject
      const reflectedValue = reflector.getAllAndMerge(decorator, [
        Test1,
        Test2,
      ]);
      expect(reflectedValue).toEqual({
        ...value1,
        ...value2,
      });
    });
    it("should reflect metadata of all targets and return a single value", () => {
      const value = "value";
      Reflect.defineMetadata(key, value, Test1);

      const result = reflector.getAllAndMerge(key, [Test1, Test2]);
      // @ts-expect-error Mismatch types
      expect(result).toEqual(value);
    });
    it("should reflect metadata of all targets and return a single array unmodified", () => {
      const value = ["value"];
      Reflect.defineMetadata(key, value, Test1);
      expect(reflector.getAllAndMerge(key, [Test1, Test2])).toEqual(value);
    });
    it("should reflect metadata of all targets and return a single object unmodified", () => {
      const value = { test: "value" };
      Reflect.defineMetadata(key, value, Test1);
      expect(reflector.getAllAndMerge(key, [Test1, Test2])).toEqual(value);
    });
  });

  describe("getAllAndOverride", () => {
    it("should reflect metadata of all targets and return a first not undefined value", () => {
      const value1 = "value1";
      const value2 = "value2";
      Reflect.defineMetadata(key, value1, Test1);
      Reflect.defineMetadata(key, value2, Test2);
      // @ts-expect-error Mismatch types
      expect(reflector.getAllAndOverride(key, [Test1, Test2])).toEqual(value1);
    });
  });

  describe("createMetadataDecorator", () => {
    it("should create a metadata decorator with transform function", () => {
      const metadataDecorator = Reflector.createMetadataDecorator<string, Record<string, any>>({
        transform: (value) => ({
          customKey: value,
          additionalKey: `processed-${value}`,
        }),
      });

      @metadataDecorator("test-value")
      class TestClass {}

      expect(Reflect.getMetadata("customKey", TestClass)).toEqual("test-value");
      expect(Reflect.getMetadata("additionalKey", TestClass)).toEqual("processed-test-value");
      expect(Reflect.getMetadata(metadataDecorator.KEY, TestClass)).toEqual(true);
    });

    it("should create a metadata decorator with custom key", () => {
      const metadataDecorator = Reflector.createMetadataDecorator<string, Record<string, any>>({
        key: "custom-metadata-key",
        transform: (value) => ({
          data: value,
        }),
      });

      @metadataDecorator("custom-value")
      class TestClass {}

      expect(Reflect.getMetadata("data", TestClass)).toEqual("custom-value");
      expect(Reflect.getMetadata("custom-metadata-key", TestClass)).toEqual(true);
      expect(metadataDecorator.KEY).toEqual("custom-metadata-key");
    });

    it("should handle undefined values in metadata decorator transform", () => {
      const metadataDecorator = Reflector.createMetadataDecorator<string, Record<string, any>>({
        transform: (value) => ({
          definedKey: value,
          undefinedKey: undefined,
        }),
      });

      @metadataDecorator("test")
      class TestClass {}

      expect(Reflect.getMetadata("definedKey", TestClass)).toEqual("test");
      expect(Reflect.getMetadata("undefinedKey", TestClass)).toBeUndefined();
      expect(Reflect.getMetadata(metadataDecorator.KEY, TestClass)).toEqual(true);
    });
  });

  describe("has", () => {
    const testKey = "test-has-key";
    class TestHasClass {}

    beforeEach(() => {
      Reflect.deleteMetadata(testKey, TestHasClass);
    });

    it("should return true when metadata exists for a key", () => {
      Reflect.defineMetadata(testKey, "some-value", TestHasClass);
      expect(reflector.has(testKey, TestHasClass)).toEqual(true);
    });

    it("should return false when metadata does not exist for a key", () => {
      expect(reflector.has(testKey, TestHasClass)).toEqual(false);
    });

    it("should return true when metadata exists for a decorator", () => {
      const decorator = Reflector.createDecorator<string>();
      Reflect.defineMetadata(decorator.KEY, "some-value", TestHasClass);
      expect(reflector.has(decorator, TestHasClass)).toEqual(true);
    });

    it("should return false when metadata does not exist for a decorator", () => {
      const decorator = Reflector.createDecorator<string>();
      expect(reflector.has(decorator, TestHasClass)).toEqual(false);
    });

    it("should check metadata existence with custom decorator key", () => {
      const decorator = Reflector.createDecorator<string>({ key: "custom-has-key" });
      
      expect(reflector.has(decorator, TestHasClass)).toEqual(false);
      
      Reflect.defineMetadata("custom-has-key", "value", TestHasClass);
      expect(reflector.has(decorator, TestHasClass)).toEqual(true);
    });
  });
});