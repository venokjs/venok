import { beforeEach, describe, expect, it } from "bun:test";
import { MetadataScanner } from "~/metadata-scanner.js";

describe("MetadataScanner", () => {
  let scanner: MetadataScanner;
  beforeEach(() => {
    scanner = new MetadataScanner();
  });
  describe("scanFromPrototype", () => {
    class Parent {
      constructor() {}
      public testParent() {}
      public testParent2() {}
      get propParent() {
        return "";
      }
      set valParent(value: any) {}
    }

    class Test extends Parent {
      constructor() {
        super();
      }
      get prop() {
        return "";
      }
      set val(value: any) {}
      public test() {}
      public test2() {}
    }

    it("should return only methods", () => {
      const methods = scanner.getAllMethodNames(Test.prototype);
      expect(methods).toEqual(["test", "test2", "testParent", "testParent2"]);
    });

    it("should return the same instance for the same prototype", () => {
      const methods1 = scanner.getAllMethodNames(Test.prototype);
      const methods2 = scanner.getAllMethodNames(Test.prototype);
      expect(methods1 === methods2).toEqual(true);
    });
  });
});