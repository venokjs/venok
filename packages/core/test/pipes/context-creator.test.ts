import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import { VenokContainer } from "~/injector/container.js";
import { PipesContextCreator } from "~/pipes/context-creator.js";
import { ApplicationConfig } from "~/application/config.js";
import { InstanceWrapper } from "~/injector/instance/wrapper.js";

class Pipe {}

describe("PipesContextCreator", () => {
  let creator: PipesContextCreator;
  let container: VenokContainer;
  let applicationConfig: ApplicationConfig;

  beforeEach(() => {
    container = new VenokContainer();
    applicationConfig = new ApplicationConfig();
    creator = new PipesContextCreator(container, applicationConfig);
  });
  describe("createConcreteContext", () => {
    describe("when metadata is empty or undefined", () => {
      it("should return empty array", () => {
        expect(creator.createConcreteContext(undefined as any)).toEqual([]);
        expect(creator.createConcreteContext([])).toEqual([]);
      });
    });
    describe("when metadata is not empty or undefined", () => {
      const metadata = [null, {}, { transform: () => ({}) }];
      it("should return expected array", () => {
        const transforms = creator.createConcreteContext(metadata as any);
        expect(transforms).toHaveLength(1);
      });
    });
  });
  describe("getPipeInstance", () => {
    describe("when param is an object", () => {
      it("should return instance", () => {
        const instance = { transform: () => null };
        expect(creator.getPipeInstance(instance)).toEqual(instance);
      });
    });
    describe("when param is a constructor", () => {
      it("should pick instance from container", () => {
        const wrapper: InstanceWrapper = {
          instance: "test",
          getInstanceByContextId: () => wrapper,
        } as any;
        spyOn(creator, "getInstanceByMetatype").mockImplementation(() => wrapper);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        expect(creator.getPipeInstance(Pipe)).toEqual(wrapper.instance);
      });
      it("should return null", () => {
        spyOn(creator, "getInstanceByMetatype").mockImplementation(() => null as any);
        expect(creator.getPipeInstance(Pipe)).toEqual(null);
      });
    });
  });

  describe("getInstanceByMetatype", () => {
    describe('when "moduleContext" is nil', () => {
      it("should return undefined", () => {
        (creator as any).moduleContext = undefined;
        // @ts-expect-error Mismatch types
        expect(creator.getInstanceByMetatype(null)).toBeUndefined();
      });
    });
    describe('when "moduleContext" is not nil', () => {
      beforeEach(() => {
        (creator as any).moduleContext = "test";
      });

      describe("and when module exists", () => {
        it("should return undefined", () => {
          spyOn(container.getModules(), "get").mockImplementation(() => undefined);
          // @ts-expect-error Mismatch types
          expect(creator.getInstanceByMetatype(null)).toBeUndefined();
        });
      });

      describe("and when module does not exist", () => {
        it("should return instance", () => {
          const instance = { test: true };
          const module = { injectables: { get: () => instance } };
          spyOn(container.getModules(), "get").mockImplementation(() => module as any);
          // @ts-expect-error Mismatch types
          expect(creator.getInstanceByMetatype(class Test {})).toEqual(instance);
        });
      });
    });
  });

  describe("getGlobalMetadata", () => {
    describe("when contextId is static and inquirerId is nil", () => {
      it("should return global pipes", () => {
        const expectedResult = applicationConfig.getGlobalPipes();
        expect(creator.getGlobalMetadata()).toEqual(expectedResult);
      });
    });
    describe("otherwise", () => {
      it("should merge static global with request/transient scoped pipes", () => {
        const globalPipes: any = ["test"];
        const instanceWrapper = new InstanceWrapper();
        const instance = "request-scoped";
        const scopedPipeWrappers = [instanceWrapper];

        spyOn(applicationConfig, "getGlobalPipes").mockImplementation(() => globalPipes);
        spyOn(applicationConfig, "getGlobalRequestPipes").mockImplementation(() => scopedPipeWrappers);
        spyOn(instanceWrapper, "getInstanceByContextId").mockImplementation(() => ({ instance }) as any);

        const result = creator.getGlobalMetadata({ id: 3 });
        expect(result).toContain(instance);
        globalPipes.forEach((pipe: any) => expect(result).toContain(pipe));
      });
    });
  });
});
