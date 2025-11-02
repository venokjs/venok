/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import { of } from "rxjs";
import { GuardsConsumer } from "~/guards/consumer.js";
import { GuardsContextCreator } from "~/guards/context-creator.js";
import { PipesConsumer } from "~/pipes/consumer.js";
import { VenokContainer } from "~/injector/container.js";
import { VenokContextCreator } from "~/context/context.js";
import { InterceptorsContextCreator } from "~/interceptors/context-creator.js";
import { InterceptorsConsumer } from "~/interceptors/consumer.js";
import { ModulesContainer } from "~/injector/module/container.js";
import { PipesContextCreator } from "~/pipes/context-creator.js";
import { VenokExceptionFilterContext } from "~/filters/context.js";
import { Module } from "~/injector/module/module.js";
import { FORBIDDEN_MESSAGE, CUSTOM_ROUTE_ARGS_METADATA } from "~/constants.js";
import { ApplicationConfig } from "~/application/config.js";

describe("VenokContextCreator", () => {
  let contextCreator: VenokContextCreator;
  let callback: any;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let bindSpy: any;
  let applySpy: any;
  let guardsConsumer: GuardsConsumer;
  let pipesConsumer: PipesConsumer;
  let guardsContextCreator: GuardsContextCreator;

  beforeEach(() => {
    callback = {
      bind: () => ({}),
      apply: () => ({}),
    };
    bindSpy = spyOn(callback, "bind");
    applySpy = spyOn(callback, "apply");

    guardsConsumer = new GuardsConsumer();
    pipesConsumer = new PipesConsumer();
    guardsContextCreator = new GuardsContextCreator(new VenokContainer());
    spyOn(guardsContextCreator, "create").mockReturnValue([{}] as any);
    contextCreator = new VenokContextCreator(
      guardsContextCreator,
      guardsConsumer,
      new InterceptorsContextCreator(new VenokContainer()),
      new InterceptorsConsumer(),
      new ModulesContainer(),
      new PipesContextCreator(new VenokContainer()),
      pipesConsumer,
      new VenokExceptionFilterContext(new VenokContainer())
    );
  });
  describe("create", () => {
    it('should call "getContextModuleName" with expected argument', done => {
      const getContextModuleKeySpy = spyOn(
        contextCreator,
        "getContextModuleKey"
      );
      contextCreator.create({ foo: "bar" }, callback, "", "", null!);
      expect(getContextModuleKeySpy).toHaveBeenCalled();
      done();
    });
    describe("returns proxy function", () => {
      // @ts-expect-error Mismatch types
      let proxyContext;
      let instance;

      beforeEach(() => {
        instance = { foo: "bar" };
        proxyContext = contextCreator.create(
          instance, 
          callback, 
          "", 
          "", 
          null!,
          // @ts-expect-error Mismatch types
          "", 
          { filters: false, guards: true, interceptors: true, callback: () => {} }
        );
      });
      it("should be a function", () => {
        // @ts-expect-error Mismatch types
        expect(typeof proxyContext).toBe("function");
      });
      describe("when proxy function called", () => {
        describe("when can not activate", () => {
          it('should throw exception when "tryActivate" returns false', async () => {
            spyOn(guardsConsumer, "tryActivate")
              .mockImplementation(async () => false);

            // @ts-expect-error Mismatch types
            await expect(proxyContext(1, 2, 3)).rejects.toThrow(FORBIDDEN_MESSAGE);
          });
        });
        describe("when can activate", () => {
          it("should apply context and args", async () => {
            const args = [1, 2, 3];
            spyOn(guardsConsumer, "tryActivate")
              .mockImplementation(async () => true);

            // @ts-expect-error Mismatch types
            await proxyContext(...args);
            expect(applySpy).toHaveBeenCalled();
          });
        });
      });
    });
  });
  describe("getContextModuleKey", () => {
    describe("when constructor is undefined", () => {
      it("should return empty string", () => {
        expect(contextCreator.getContextModuleKey(undefined)).toBe("");
      });
    });
    describe("when module reference provider exists", () => {
      it("should return module key", () => {
        const modules = new Map();
        const moduleKey = "key";

        const moduleRef = new Module(class {}, modules as any);
        modules.set(moduleKey, moduleRef);
        (contextCreator as any).modulesContainer = modules;

        spyOn(moduleRef, "hasProvider").mockImplementation(() => true);

        expect(
          contextCreator.getContextModuleKey({ randomObject: true } as any)
        ).toBe(moduleKey);
      });
    });
    describe("when provider does not exists", () => {
      it("should return empty string", () => {
        expect(contextCreator.getContextModuleKey({} as any)).toBe("");
      });
    });
  });
  describe("createPipesFn", () => {
    describe('when "paramsOptions" is empty', () => {
      it("returns null", async () => {
        // @ts-expect-error Mismatch types
        const pipesFn = contextCreator.createPipesFn([], []);
        expect(pipesFn).toBeNull();
      });
    });
    describe('when "paramsOptions" is not empty', () => {
      it("returns function", async () => {
        // @ts-expect-error Mismatch types
        const pipesFn = contextCreator.createPipesFn(
          [],
          [
            {
              index: 1,
              type: "test",
              data: null!,
              pipes: [],
              extractValue: () => null,
            },
          ]
        )!;
        await pipesFn([]);
        expect(typeof pipesFn).toBe("function");
      });
    });
  });

  describe("transformToResult", () => {
    describe("when resultOrDeferred", () => {
      describe("is Promise", () => {
        it("should return Promise", async () => {
          const value = 100;
          expect(
            await contextCreator.transformToResult(Promise.resolve(value))
          ).toBe(100);
        });
      });

      describe("is Observable", () => {
        it("should return Promise", async () => {
          const value = 100;
          expect(await contextCreator.transformToResult(of(value))).toBe(
            100
          );
        });
      });

      describe("is value", () => {
        it("should return Promise", async () => {
          const value = 100;
          expect(await contextCreator.transformToResult(value)).toBe(100);
        });
      });
    });
  });

  describe("fromContainer", () => {
    it("should create VenokContextCreator instance from container", () => {
      const applicationConfig = new ApplicationConfig();
      const container = new VenokContainer(applicationConfig);
      
      const result = VenokContextCreator.fromContainer(container);
      
      expect(result).toBeInstanceOf(VenokContextCreator);
      expect(result.container).toBe(container);
    });

    it("should create VenokContextCreator with custom contextClass", () => {
      const applicationConfig = new ApplicationConfig();
      const container = new VenokContainer(applicationConfig);
      
      class CustomContextCreator extends VenokContextCreator {}
      
      const result = VenokContextCreator.fromContainer(container, CustomContextCreator);
      
      expect(result).toBeInstanceOf(CustomContextCreator);
      expect(result.container).toBe(container);
    });

    it("should create VenokContextCreator with custom filtersContext", () => {
      const applicationConfig = new ApplicationConfig();
      const container = new VenokContainer(applicationConfig);
      
      class CustomFiltersContext extends VenokExceptionFilterContext {}
      
      const result = VenokContextCreator.fromContainer(container, VenokContextCreator, CustomFiltersContext);
      
      expect(result).toBeInstanceOf(VenokContextCreator);
      expect(result.container).toBe(container);
    });
  });

  describe("getMetadata", () => {
    let instance: any;
    
    beforeEach(() => {
      instance = {
        testMethod: () => {},
      };
    });

    it("should return cached metadata if available", () => {
      const cachedMetadata = {
        argsLength: 2,
        paramtypes: [String, Number],
        getParamsMetadata: () => [],
      };
      
      (contextCreator as any).handlerMetadataStorage.set(instance, "testMethod", cachedMetadata);
      
      const result = contextCreator.getMetadata(instance, "testMethod");
      
      expect(result).toBe(cachedMetadata);
    });

    it("should create and cache new metadata if not cached", () => {
      spyOn(contextCreator.contextUtils, "reflectCallbackMetadata").mockReturnValue({});
      spyOn(contextCreator.contextUtils, "getArgumentsLength").mockReturnValue(0);
      spyOn(contextCreator.contextUtils, "reflectCallbackParamtypes").mockReturnValue([]);
      // @ts-expect-error Mismatch types
      spyOn(contextCreator.contextUtils, "getContextFactory").mockReturnValue(() => ({}));
      
      const result = contextCreator.getMetadata(instance, "testMethod");
      
      expect(result).toHaveProperty("argsLength");
      expect(result).toHaveProperty("paramtypes");
      expect(result).toHaveProperty("getParamsMetadata");
    });

    it("should handle paramsFactory in getParamsMetadata", () => {
      spyOn(contextCreator.contextUtils, "reflectCallbackMetadata").mockReturnValue({});
      spyOn(contextCreator.contextUtils, "getArgumentsLength").mockReturnValue(0);
      spyOn(contextCreator.contextUtils, "reflectCallbackParamtypes").mockReturnValue([]);
      // @ts-expect-error Mismatch types
      spyOn(contextCreator.contextUtils, "getContextFactory").mockReturnValue(() => ({}));
      
      const paramsFactory = {
        exchangeKeyForValue: () => {},
      };
      
      const result = contextCreator.getMetadata(instance, "testMethod", undefined, paramsFactory as any);
      const paramsMetadata = result.getParamsMetadata("moduleKey");
      
      expect(paramsMetadata).toBeDefined();
    });
  });

  describe("exchangeKeysForValues", () => {
    let paramsFactory: any;
    
    beforeEach(() => {
      paramsFactory = {
        // @ts-expect-error Mismatch types
        exchangeKeyForValue: spyOn({}, "exchangeKeyForValue").mockReturnValue("value"),
      };

      // @ts-expect-error Mismatch types
      spyOn(contextCreator.pipesContextCreator, "setModuleContext");
      // @ts-expect-error Mismatch types
      spyOn(contextCreator.pipesContextCreator, "createConcreteContext").mockReturnValue([]);
      spyOn(contextCreator.contextUtils, "mapParamType").mockReturnValue("type");
    });

    it("should handle custom route args metadata", () => {
      const keys = [`${CUSTOM_ROUTE_ARGS_METADATA}:custom`];
      const metadata = {
        [`${CUSTOM_ROUTE_ARGS_METADATA}:custom`]: {
          index: 0,
          data: "customData",
          pipes: [],
          factory: () => "customValue",
        },
      };
      
      spyOn(contextCreator.contextUtils, "getCustomFactory").mockReturnValue(() => "customExtractValue");
      
      const result = contextCreator.exchangeKeysForValues(keys, metadata, "moduleKey", paramsFactory);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("extractValue");
      expect(result[0].type).toBe("type");
    });

    it("should handle regular params metadata", () => {
      const keys = ["regularParam"];
      const metadata = {
        regularParam: {
          index: 0,
          data: "data",
          pipes: [],
        },
      };
      
      const result = contextCreator.exchangeKeysForValues(keys, metadata, "moduleKey", paramsFactory);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("extractValue");
      expect(result[0].type).toBe("type");
      expect(typeof result[0].extractValue).toBe("function");
    });

    it("should call setModuleContext on pipesContextCreator", () => {
      const keys = ["param"];
      const metadata = { param: { index: 0, data: null, pipes: [] } };
      
      contextCreator.exchangeKeysForValues(keys, metadata, "moduleKey", paramsFactory);

      // @ts-expect-error Mismatch types
      expect(contextCreator.pipesContextCreator.setModuleContext).toHaveBeenCalledWith("moduleKey");
    });
  });

  describe("getParamValue", () => {
    it("should return value directly if no pipes", async () => {
      const value = "testValue";
      const metadata = { type: "param", data: null, metatype: String, contextType: "native" };
      
      const result = await contextCreator.getParamValue(value, metadata as any, []);
      
      expect(result).toBe(value);
    });

    it("should apply pipes if provided", async () => {
      const value = "testValue";
      const transformedValue = "transformedValue";
      const metadata = { type: "param", data: null, metatype: String, contextType: "native" };
      const pipes = [{ transform: () => transformedValue }];
      
      spyOn(pipesConsumer, "apply").mockResolvedValue(transformedValue);
      
      const result = await contextCreator.getParamValue(value, metadata as any, pipes as any);
      
      expect(pipesConsumer.apply).toHaveBeenCalledWith(value, metadata, pipes);
      expect(result).toBe(transformedValue);
    });
  });

  describe("createGuardsFn", () => {
    it("should return null if no guards", () => {
      const result = contextCreator.createGuardsFn([], {}, () => {});
      
      expect(result).toBeNull();
    });

    it("should return function if guards exist", () => {
      const guards = [{ canActivate: () => true }];
      const result = contextCreator.createGuardsFn(guards, {}, () => {});
      
      expect(typeof result).toBe("function");
    });

    it("should throw exception when guards return false", async () => {
      const guards = [{ canActivate: () => false }];
      spyOn(guardsConsumer, "tryActivate").mockResolvedValue(false);
      
      const guardsFn = contextCreator.createGuardsFn(guards, {}, () => {});
      
      await expect(guardsFn!([1, 2, 3])).rejects.toThrow(FORBIDDEN_MESSAGE);
    });

    it("should not throw when guards return true", async () => {
      const guards = [{ canActivate: () => true }];
      spyOn(guardsConsumer, "tryActivate").mockResolvedValue(true);
      
      const guardsFn = contextCreator.createGuardsFn(guards, {}, () => {});
      
      await expect(guardsFn!([1, 2, 3])).resolves.toBeUndefined();
    });
  });
});