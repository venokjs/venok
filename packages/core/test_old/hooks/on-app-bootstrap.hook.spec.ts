import { expect } from "chai";
import sinon from "sinon";
import { VenokContainer } from "@venok/core/injector/container";
import { OnApplicationBootstrap } from "@venok/core/interfaces/hooks";
import { Module } from "@venok/core/injector/module/module";
import { callModuleBootstrapHook } from "@venok/core/hooks";

class SampleProvider implements OnApplicationBootstrap {
  onApplicationBootstrap() {}
}

class SampleModule implements OnApplicationBootstrap {
  onApplicationBootstrap() {}
}

class WithoutHookProvider {}

describe("OnApplicationBootstrap", () => {
  let moduleRef: Module;
  let sampleProvider: SampleProvider;

  beforeEach(() => {
    sampleProvider = new SampleProvider();
    moduleRef = new Module(SampleModule, new VenokContainer());

    const moduleWrapperRef = moduleRef.getProviderByKey(SampleModule);
    moduleWrapperRef.instance = new SampleModule();

    moduleRef.addProvider({
      provide: SampleProvider,
      useValue: sampleProvider,
    });
    moduleRef.addProvider({
      provide: WithoutHookProvider,
      useValue: new WithoutHookProvider(),
    });
  });

  describe("callModuleBootstrapHook", () => {
    it('should call "onApplicationBootstrap" hook for the entire module', async () => {
      const hookSpy = sinon.spy(sampleProvider, "onApplicationBootstrap");
      await callModuleBootstrapHook(moduleRef);

      expect(hookSpy.called).to.be.true;
    });
  });
});
