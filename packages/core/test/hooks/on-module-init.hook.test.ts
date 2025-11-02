import type { OnModuleInit } from "~/interfaces/index.js";

import { beforeEach, describe, expect, it, spyOn } from "bun:test";

import { VenokContainer } from "~/injector/container.js";
import { CoreModule } from "~/index.js";
import { callModuleInitHook } from "~/hooks/on-module-init.hook.js";


class SampleProvider implements OnModuleInit {
  onModuleInit() {}
}

class SampleModule implements OnModuleInit {
  onModuleInit() {}
}

class WithoutHookProvider {}

describe("OnModuleInit", () => {
  let moduleRef: CoreModule;
  let sampleProvider: SampleProvider;

  beforeEach(() => {
    sampleProvider = new SampleProvider();
    moduleRef = new CoreModule(SampleModule, new VenokContainer());

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
      const hookSpy = spyOn(sampleProvider, "onModuleInit");
      await callModuleInitHook(moduleRef);

      expect(hookSpy).toHaveBeenCalled();
    });
  });
});
