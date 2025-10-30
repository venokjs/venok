import type { BeforeApplicationShutdown } from "~/interfaces/index.js";

import { beforeEach, describe, expect, it, spyOn } from "bun:test";

import { VenokContainer } from "~/injector/container.js";
import { CoreModule } from "~/index.js";
import { callBeforeAppShutdownHook } from "~/hooks/before-app-shutdown.hook.js";

class SampleProvider implements BeforeApplicationShutdown {
  beforeApplicationShutdown(signal?: string) {}
}

class SampleModule implements BeforeApplicationShutdown {
  beforeApplicationShutdown(signal?: string) {}
}

class WithoutHookProvider {}

describe("BeforeAppShutdown", () => {
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

  describe("callBeforeAppShutdownHook", () => {
    it('should call "beforeApplicationShutdown" hook for the entire module', async () => {
      const signal = "SIGTERM";

      const hookSpy = spyOn(sampleProvider, "beforeApplicationShutdown");
      await callBeforeAppShutdownHook(moduleRef, signal);

      expect(hookSpy).toHaveBeenCalledWith(signal);
    });
  });
});
