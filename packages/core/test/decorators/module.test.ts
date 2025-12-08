import { describe, expect, it } from "bun:test";
import { Module } from "~/decorators/module.decorator.js";

describe("@Module", () => {
  const moduleProps = {
    providers: ["Test"],
    imports: ["Test"],
    exports: ["Test"],
  };

  // @ts-expect-error Mismatch types
  @Module(moduleProps)
  class TestModule {}

  it("should enhance class with expected module metadata", () => {
    const imports = Reflect.getMetadata("imports", TestModule);
    const providers = Reflect.getMetadata("providers", TestModule);
    const exports = Reflect.getMetadata("exports", TestModule);

    expect(imports).toEqual(moduleProps.imports);
    expect(providers).toEqual(moduleProps.providers);
    expect(exports).toEqual(moduleProps.exports);
  });

  it("should accept custom properties and merge them into providers", () => {
    const customProps = {
      providers: ["TestProvider"],
      controllers: ["TestController"],
      queues: ["TestQueue"],
      processors: ["TestProcessor"],
    };

    // @ts-expect-error Custom properties
    @Module(customProps)
    class CustomModule {}

    const providers = Reflect.getMetadata("providers", CustomModule);
    
    expect(providers).toEqual([
      "TestProvider",
      "TestController", 
      "TestQueue",
      "TestProcessor"
    ]);
  });

  it("should work with only custom properties (no standard providers)", () => {
    const onlyCustomProps = {
      controllers: ["Controller1", "Controller2"],
      services: ["Service1"],
    };

    // @ts-expect-error Custom properties
    @Module(onlyCustomProps)
    class OnlyCustomModule {}

    const providers = Reflect.getMetadata("providers", OnlyCustomModule);
    
    expect(providers).toEqual([
      "Controller1",
      "Controller2", 
      "Service1"
    ]);
  });

  it("should not set providers metadata if no providers exist", () => {
    const emptyProps = {
      imports: ["TestImport"],
      exports: ["TestExport"],
    };

    // @ts-expect-error Empty props
    @Module(emptyProps)
    class EmptyModule {}

    const providers = Reflect.getMetadata("providers", EmptyModule);
    const imports = Reflect.getMetadata("imports", EmptyModule);
    const exports = Reflect.getMetadata("exports", EmptyModule);
    
    expect(providers).toBeUndefined();
    expect(imports).toEqual(["TestImport"]);
    expect(exports).toEqual(["TestExport"]);
  });

  it("should no longer throw exception for custom properties", () => {
    const customProps = {
      providers: ["Test"],
      customKey: ["CustomValue"],
    };

    // @ts-expect-error Custom properties
    expect(() => Module(customProps)).not.toThrow();
  });
});