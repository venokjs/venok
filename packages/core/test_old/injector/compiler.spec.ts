import { expect } from "chai";
import { ModuleCompiler } from "@venok/core/injector/module/compiler";

describe("ModuleCompiler", () => {
  let compiler: ModuleCompiler;
  beforeEach(() => {
    compiler = new ModuleCompiler();
  });

  describe("extractMetadata", () => {
    describe("when module is a dynamic module", () => {
      it('should return object with "type" and "dynamicMetadata" property', async () => {
        const obj = { module: "test", providers: [] };
        const { module, ...dynamicMetadata } = obj;
        expect(compiler.extractMetadata(obj as any)).to.be.deep.equal({
          type: module,
          dynamicMetadata,
        });
      });
    });
    describe("when module is a not dynamic module", () => {
      it('should return object with "type" property', async () => {
        const type = "test";
        expect(compiler.extractMetadata(type as any)).to.be.deep.equal({
          type,
        });
      });
    });
  });

  describe("isDynamicModule", () => {
    describe("when module is a dynamic module", () => {
      it("should return true", () => {
        expect(compiler.isDynamicModule({ module: true } as any)).to.be.true;
      });
    });
    describe("when module is a dynamic module", () => {
      it("should return false", () => {
        expect(compiler.isDynamicModule({ x: true } as any)).to.be.false;
      });
    });
  });
});
