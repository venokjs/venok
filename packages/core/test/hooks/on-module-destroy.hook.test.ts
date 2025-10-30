import type { OnModuleDestroy } from "~/interfaces/index.js";

import { beforeEach, describe, expect, it, spyOn } from "bun:test";

import { VenokContainer } from "~/injector/container.js";
import { CoreModule } from "~/index.js";
import { callModuleDestroyHook } from "~/hooks/on-module-destroy.hook.js";

class SampleProvider implements OnModuleDestroy {
  onModuleDestroy() {}
}

class SampleModule implements OnModuleDestroy {
  onModuleDestroy() {}
}

class WithoutHookProvider {}

describe("OnModuleDestroy", () => {
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

  describe("callModuleDestroyHook", () => {
    it('should call "onModuleDestroy" hook for the entire module', async () => {
      const hookSpy = spyOn(sampleProvider, "onModuleDestroy");
      await callModuleDestroyHook(moduleRef);

      expect(hookSpy).toHaveBeenCalled();
    });
  });
});
