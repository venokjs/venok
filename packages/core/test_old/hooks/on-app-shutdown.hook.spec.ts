import { expect } from "chai";
import sinon from "sinon";
import { VenokContainer } from "@venok/core/injector/container";
import { OnApplicationShutdown } from "@venok/core/interfaces/hooks";
import { Module } from "@venok/core/injector/module/module";
import { callAppShutdownHook } from "@venok/core/hooks";

class SampleProvider implements OnApplicationShutdown {
  onApplicationShutdown() {}
}

class SampleModule implements OnApplicationShutdown {
  onApplicationShutdown() {}
}

class WithoutHookProvider {}

describe("OnApplicationShutdown", () => {
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

  describe("callAppShutdownHook", () => {
    it('should call "onApplicationShutdown" hook for the entire module', async () => {
      const hookSpy = sinon.spy(sampleProvider, "onApplicationShutdown");
      await callAppShutdownHook(moduleRef);

      expect(hookSpy.called).to.be.true;
    });
  });
});
