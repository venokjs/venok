import { expect } from "chai";
import { of } from "rxjs";
import sinon from "sinon";
import { VenokContextCreator } from "@venok/core/context/context";
import { GuardsConsumer, GuardsContextCreator } from "@venok/core/guards";
import { PipesConsumer, PipesContextCreator } from "@venok/core/pipes";
import { VenokContainer } from "@venok/core/injector/container";
import { InterceptorsConsumer, InterceptorsContextCreator } from "@venok/core/interceptors";
import { ModulesContainer } from "@venok/core/injector/module/container";
import { VenokExceptionFilterContext } from "@venok/core/filters/context";
import { Module } from "@venok/core/injector/module/module";
import { RuntimeException } from "@venok/core/errors/exceptions";

describe("VenokContextCreator", () => {
  let contextCreator: VenokContextCreator;
  let callback: any;
  let bindSpy: sinon.SinonSpy;
  let applySpy: sinon.SinonSpy;
  let guardsConsumer: GuardsConsumer;
  let pipesConsumer: PipesConsumer;
  let guardsContextCreator: GuardsContextCreator;

  beforeEach(() => {
    callback = {
      bind: () => ({}),
      apply: () => ({}),
    };
    bindSpy = sinon.spy(callback, "bind");
    applySpy = sinon.spy(callback, "apply");

    guardsConsumer = new GuardsConsumer();
    pipesConsumer = new PipesConsumer();
    guardsContextCreator = new GuardsContextCreator(new VenokContainer());
    sinon.stub(guardsContextCreator, "create").returns([{}] as any);
    contextCreator = new VenokContextCreator(
      guardsContextCreator,
      guardsConsumer,
      new InterceptorsContextCreator(new VenokContainer()),
      new InterceptorsConsumer(),
      new ModulesContainer(),
      new PipesContextCreator(new VenokContainer()),
      pipesConsumer,
      new VenokExceptionFilterContext(new VenokContainer()),
    );
  });
  describe("create", () => {
    it('should call "getContextModuleName" with expected argument', (done) => {
      const getContextModuleKeySpy = sinon.spy(contextCreator, "getContextModuleKey");
      contextCreator.create({ foo: "bar" }, callback as any, "", "", null as any);
      expect(getContextModuleKeySpy.called).to.be.true;
      done();
    });
    describe("returns proxy function", () => {
      let proxyContext: any;
      let instance;

      beforeEach(() => {
        instance = { foo: "bar" };
        proxyContext = contextCreator.create(instance, callback as any, "", "", null as any);
      });
      it("should be a function", () => {
        expect(proxyContext).to.be.a("function");
      });
      describe("when proxy function called", () => {
        // describe("when can not activate", () => {
        //   it('should throw exception when "tryActivate" returns false', async () => {
        //     sinon.stub(guardsConsumer, "tryActivate").callsFake(async () => false);
        //     let err: any;
        //     try {
        //       await proxyContext(1, 2, 3);
        //     } catch (e) {
        //       console.log(e);
        //       err = e;
        //     }
        //     expect(err).to.be.instanceOf(RuntimeException);
        //   });
        // });
        describe("when can activate", () => {
          it("should apply context and args", async () => {
            const args = [1, 2, 3];
            sinon.stub(guardsConsumer, "tryActivate").callsFake(async () => true);

            await proxyContext(...args);
            expect(applySpy.called).to.be.true;
          });
        });
      });
    });
  });
  describe("getContextModuleKey", () => {
    describe("when constructor is undefined", () => {
      it("should return empty string", () => {
        expect(contextCreator.getContextModuleKey(undefined)).to.be.eql("");
      });
    });
    describe("when module reference provider exists", () => {
      it("should return module key", () => {
        const modules = new Map();
        const moduleKey = "key";

        const moduleRef = new Module(class {}, modules as any);
        modules.set(moduleKey, moduleRef);
        (contextCreator as any).modulesContainer = modules;

        sinon.stub(moduleRef, "hasProvider").callsFake(() => true);

        expect(contextCreator.getContextModuleKey({ randomObject: true } as any)).to.be.eql(moduleKey);
      });
    });
    describe("when provider does not exists", () => {
      it("should return empty string", () => {
        expect(contextCreator.getContextModuleKey({} as any)).to.be.eql("");
      });
    });
  });
  describe("createPipesFn", () => {
    describe('when "paramsOptions" is empty', () => {
      it("returns null", async () => {
        const pipesFn = contextCreator.createPipesFn([], [], "native");
        expect(pipesFn).to.be.null;
      });
    });
    describe('when "paramsOptions" is not empty', () => {
      it("returns function", async () => {
        const pipesFn = contextCreator.createPipesFn(
          [],
          [
            {
              index: 1,
              type: "test",
              data: null as any,
              pipes: [],
              extractValue: () => null,
            },
          ],
          "native",
        ) as any;
        await pipesFn([]);
        expect(pipesFn).to.be.a("function");
      });
    });
  });

  describe("transformToResult", () => {
    describe("when resultOrDeferred", () => {
      describe("is Promise", () => {
        it("should return Promise", async () => {
          const value = 100;
          expect(await contextCreator.transformToResult(Promise.resolve(value))).to.be.eq(100);
        });
      });

      describe("is Observable", () => {
        it("should return Promise", async () => {
          const value = 100;
          expect(await contextCreator.transformToResult(of(value))).to.be.eq(100);
        });
      });

      describe("is value", () => {
        it("should return Promise", async () => {
          const value = 100;
          expect(await contextCreator.transformToResult(value)).to.be.eq(100);
        });
      });
    });
  });
});
