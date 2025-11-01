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

  it("should throw exception when module properties are invalid", () => {
    const invalidProps = {
      ...moduleProps,
      test: [],
    };

    // @ts-expect-error Mismatch types
    expect(() => Module(invalidProps)).toThrow(Error);
  });
});