import { expect } from "chai";
import sinon from "sinon";
import { VenokContainer } from "@venok/core/injector/container";
import { OnModuleInit } from "@venok/core/interfaces/hooks";
import { Module } from "@venok/core/injector/module/module";
import { callModuleInitHook } from "@venok/core/hooks";

class SampleProvider implements OnModuleInit {
  onModuleInit() {}
}

class SampleModule implements OnModuleInit {
  onModuleInit() {}
}

class WithoutHookProvider {}

describe("OnModuleInit", () => {
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

  describe("callModuleInitHook", () => {
    it('should call "onModuleInit" hook for the entire module', async () => {
      const hookSpy = sinon.spy(sampleProvider, "onModuleInit");
      await callModuleInitHook(moduleRef);

      expect(hookSpy.called).to.be.true;
    });
  });
});
