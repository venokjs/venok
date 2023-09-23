import { expect } from "chai";
import sinon from "sinon";
import { BeforeApplicationShutdown } from "@venok/core/interfaces/hooks";
import { Module } from "@venok/core/injector/module/module";
import { VenokContainer } from "@venok/core/injector/container";
import { callBeforeAppShutdownHook } from "@venok/core/hooks";

class SampleProvider implements BeforeApplicationShutdown {
  beforeApplicationShutdown(signal?: string) {}
}

class SampleModule implements BeforeApplicationShutdown {
  beforeApplicationShutdown(signal?: string) {}
}

class WithoutHookProvider {}

describe("BeforeAppShutdown", () => {
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

  describe("callBeforeAppShutdownHook", () => {
    it('should call "beforeApplicationShutdown" hook for the entire module', async () => {
      const signal = "SIGTERM";

      const hookSpy = sinon.spy(sampleProvider, "beforeApplicationShutdown");
      await callBeforeAppShutdownHook(moduleRef, signal);

      expect(hookSpy.calledWith(signal)).to.be.true;
    });
  });
});
