import type { OnApplicationBootstrap } from "~/interfaces/index.js";

import { beforeEach, describe, expect, it, spyOn } from "bun:test";

import { VenokContainer } from "~/injector/container.js";
import { CoreModule } from "~/index.js";
import { callModuleBootstrapHook } from "~/hooks/on-app-bootstrap.hook.js";


class SampleProvider implements OnApplicationBootstrap {
  onApplicationBootstrap() {}
}

class SampleModule implements OnApplicationBootstrap {
  onApplicationBootstrap() {}
}

class WithoutHookProvider {}

describe("OnApplicationBootstrap", () => {
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

  describe("callModuleBootstrapHook", () => {
    it('should call "onApplicationBootstrap" hook for the entire module', async () => {
      const hookSpy = spyOn(sampleProvider, "onApplicationBootstrap");
      await callModuleBootstrapHook(moduleRef);

      expect(hookSpy).toHaveBeenCalled();
    });
  });
});
