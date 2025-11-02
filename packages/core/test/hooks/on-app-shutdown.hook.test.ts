import type { OnApplicationShutdown } from "~/interfaces/index.js";

import { beforeEach, describe, expect, it, spyOn } from "bun:test";

import { VenokContainer } from "~/injector/container.js";
import { CoreModule } from "~/index.js";
import { callAppShutdownHook } from "~/hooks/on-app-shutdown.hook.js";

class SampleProvider implements OnApplicationShutdown {
  onApplicationShutdown() {}
}

class SampleModule implements OnApplicationShutdown {
  onApplicationShutdown() {}
}

class WithoutHookProvider {}

describe("OnApplicationShutdown", () => {
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

  describe("callAppShutdownHook", () => {
    it('should call "onApplicationShutdown" hook for the entire module', async () => {
      const hookSpy = spyOn(sampleProvider, "onApplicationShutdown");
      await callAppShutdownHook(moduleRef);

      expect(hookSpy).toHaveBeenCalled();
    });
  });
});
