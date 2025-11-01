import type { ModulesContainer } from "~/injector/module/container.js";
import type { VenokContainer } from "~/injector/container.js";

import { beforeEach, describe, expect, it, spyOn, mock } from "bun:test";

import { ApplicationConfig } from "~/application/config.js";
import { GuardsContextCreator } from "~/guards/context-creator.js";
import { InstanceWrapper } from "~/injector/instance/wrapper.js";

class Guard {}

describe("GuardsContextCreator", () => {
  let guardsContextCreator: GuardsContextCreator;
  let applicationConfig: ApplicationConfig;
  let guards: any[];
  let container: VenokContainer;
  let getSpy: any;

  class Guard1 {}
  class Guard2 {}

  beforeEach(() => {
    guards = [
      {
        name: "Guard1",
        token: Guard1,
        metatype: Guard1,
        instance: {
          canActivate: () => true,
        },
        getInstanceByContextId: () => guards[0],
      },
      {
        name: "Guard2",
        token: Guard2,
        metatype: Guard2,
        instance: {
          canActivate: () => true,
        },
        getInstanceByContextId: () => guards[1],
      },
      {},
      undefined,
    ];
    getSpy = mock().mockReturnValue({
      injectables: new Map([
        [Guard1, guards[0]],
        [Guard2, guards[1]],
      ]),
    }) as unknown as ModulesContainer;
    container = {
      getModules: () => ({
        get: getSpy,
      }),
    } as VenokContainer;
    applicationConfig = new ApplicationConfig();
    guardsContextCreator = new GuardsContextCreator(
       
      container,
      applicationConfig
    );
  });
  describe("createConcreteContext", () => {
    describe("when `moduleContext` is null", () => {
      it("should return empty array", () => {
        const result = guardsContextCreator.createConcreteContext(guards);
        expect(result).toEqual([]);
      });
    });
    describe("when `moduleContext` is defined", () => {
      beforeEach(() => {
        guardsContextCreator["moduleContext"] = "test";
      });
      it("should filter metatypes", () => {
        const guardTypeRefs = [guards[0].metatype, guards[1].instance];
        expect(
          guardsContextCreator.createConcreteContext(guardTypeRefs)
        ).toHaveLength(2);
      });
    });
  });

  describe("getGuardInstance", () => {
    describe("when param is an object", () => {
      it("should return instance", () => {
        const instance = { canActivate: () => null! };
        expect(guardsContextCreator.getGuardInstance(instance)).toEqual(
          instance
        );
      });
    });
    describe("when param is a constructor", () => {
      it("should pick instance from container", () => {
        const wrapper = {
          instance: "test",
          getInstanceByContextId: () => wrapper,
        };
        spyOn(guardsContextCreator, "getInstanceByMetatype").mockImplementation(() => wrapper as any);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        expect(guardsContextCreator.getGuardInstance(Guard)).toEqual(wrapper.instance as any);
      });
      it("should return null", () => {
        spyOn(guardsContextCreator, "getInstanceByMetatype").mockImplementation(() => null!);
        expect(guardsContextCreator.getGuardInstance(Guard)).toEqual(null);
      });
    });
  });

  describe("getInstanceByMetatype", () => {
    describe('when "moduleContext" is null', () => {
      it("should return undefined", () => {
        (guardsContextCreator as any).moduleContext = undefined;
        expect(guardsContextCreator.getInstanceByMetatype(null!)).toBeUndefined();
      });
    });
    describe('when "moduleContext" is not null', () => {
      beforeEach(() => {
        (guardsContextCreator as any).moduleContext = "test";
      });

      describe("but module does not exist", () => {
        it("should return undefined", () => {
          expect(
            guardsContextCreator.getInstanceByMetatype(class RandomModule {})
          ).toBeUndefined();
        });
      });
    });
  });

  describe("getGlobalMetadata", () => {
    describe("when contextId is static and inquirerId is null", () => {
      it("should return global guards", () => {
        const expectedResult = applicationConfig.getGlobalGuards();
        expect(guardsContextCreator.getGlobalMetadata()).toEqual(
          expectedResult
        );
      });
    });
    describe("otherwise", () => {
      it("should merge static global with request/transient scoped guards", () => {
        const globalGuards: any = ["test"];
        const instanceWrapper = new InstanceWrapper();
        const instance = "request-scoped";
        const scopedGuardWrappers = [instanceWrapper];

        spyOn(applicationConfig, "getGlobalGuards").mockImplementation(() => globalGuards);
        spyOn(applicationConfig, "getGlobalRequestGuards").mockImplementation(() => scopedGuardWrappers);
        spyOn(instanceWrapper, "getInstanceByContextId").mockImplementation(() => ({ instance }) as any);

        expect(guardsContextCreator.getGlobalMetadata({ id: 3 })).toContain(
          instance,
          // @ts-expect-error Mismatch types
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          ...globalGuards
        );
      });
    });
  });
});