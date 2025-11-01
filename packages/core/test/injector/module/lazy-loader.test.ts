import type { DependenciesScanner } from "~/scanner.js";

import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

import { LazyModuleLoader } from "~/injector/module/lazy/loader.js";
import { ModulesContainer } from "~/injector/module/container.js";
import { ModuleCompiler } from "~/injector/module/compiler.js";
import { ModuleRef } from "~/injector/module/ref.js";
import { InstanceLoader } from "~/injector/instance/loader.js";
import { Injectable } from "~/decorators/injectable.decorator.js";

describe("LazyModuleLoader", () => {
  let lazyModuleLoader: LazyModuleLoader;
  let dependenciesScanner: DependenciesScanner;
  let instanceLoader: InstanceLoader;
  let moduleCompiler: ModuleCompiler;
  let modulesContainer: ModulesContainer;
  let moduleOverrides: any[];

  @Injectable()
  class TestModule {}

  @Injectable()
  class TestProvider {}

  beforeEach(() => {
    dependenciesScanner = {
      scanForModules: mock(),
      scanModulesForDependencies: mock(),
    } as any;

    instanceLoader = {
      createInstancesOfDependencies: mock(),
      setLogger: mock(),
    } as any;

    moduleCompiler = {
      compile: mock(),
    } as any;

    modulesContainer = new ModulesContainer();
    moduleOverrides = [];

    lazyModuleLoader = new LazyModuleLoader(
      dependenciesScanner,
      instanceLoader,
      moduleCompiler,
      modulesContainer,
      moduleOverrides
    );
  });

  describe("load", () => {
    it("should load module when not already loaded", async () => {
      const loaderFn = mock(() => TestModule);
      const mockModule = {
        token: "test-token",
        getProviderByKey: mock(() => ({
          instance: { test: "moduleRef" },
        })),
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      spyOn(dependenciesScanner, "scanForModules").mockResolvedValue([mockModule]);
      spyOn(dependenciesScanner, "scanModulesForDependencies").mockResolvedValue(undefined);
      spyOn(instanceLoader, "createInstancesOfDependencies").mockResolvedValue(undefined);

      const result = await lazyModuleLoader.load(loaderFn);

      expect(dependenciesScanner.scanForModules).toHaveBeenCalledWith({
        moduleDefinition: TestModule,
        overrides: moduleOverrides,
        lazy: true,
      });
      expect(dependenciesScanner.scanModulesForDependencies).toHaveBeenCalled();
      expect(instanceLoader.createInstancesOfDependencies).toHaveBeenCalled();
      expect(mockModule.getProviderByKey).toHaveBeenCalledWith(ModuleRef);
      // @ts-expect-error Mismatch types
      expect(result).toEqual({ test: "moduleRef" });
    });

    it("should return existing module when already loaded", async () => {
      const loaderFn = mock(() => TestModule);
      const mockModule = {
        token: "test-token",
        getProviderByKey: mock(() => ({
          instance: { test: "existingModuleRef" },
        })),
      } as any;

      spyOn(dependenciesScanner, "scanForModules").mockResolvedValue([]);
      // @ts-expect-error Mismatch types
      spyOn(moduleCompiler, "compile").mockResolvedValue({ token: "test-token" });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      spyOn(modulesContainer, "get").mockReturnValue(mockModule);

      const result = await lazyModuleLoader.load(loaderFn);

      expect(dependenciesScanner.scanForModules).toHaveBeenCalledWith({
        moduleDefinition: TestModule,
        overrides: moduleOverrides,
        lazy: true,
      });
      expect(moduleCompiler.compile).toHaveBeenCalledWith(TestModule);
      expect(modulesContainer.get).toHaveBeenCalledWith("test-token");
      expect(mockModule.getProviderByKey).toHaveBeenCalledWith(ModuleRef);
      // @ts-expect-error Mismatch types
      expect(result).toEqual({ test: "existingModuleRef" });
    });

    it("should handle async loader function", async () => {
      const asyncLoaderFn = mock(async () => TestModule);
      const mockModule = {
        token: "test-token",
        getProviderByKey: mock(() => ({
          instance: { test: "asyncModuleRef" },
        })),
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      spyOn(dependenciesScanner, "scanForModules").mockResolvedValue([mockModule]);
      spyOn(dependenciesScanner, "scanModulesForDependencies").mockResolvedValue(undefined);
      spyOn(instanceLoader, "createInstancesOfDependencies").mockResolvedValue(undefined);

      const result = await lazyModuleLoader.load(asyncLoaderFn);

      expect(asyncLoaderFn).toHaveBeenCalled();
      // @ts-expect-error Mismatch types
      expect(result).toEqual({ test: "asyncModuleRef" });
    });

    it("should configure silent logger when logger option is false", async () => {
      const loaderFn = mock(() => TestModule);
      const mockModule = {
        token: "test-token",
        getProviderByKey: mock(() => ({
          instance: { test: "moduleRef" },
        })),
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      spyOn(dependenciesScanner, "scanForModules").mockResolvedValue([mockModule]);
      spyOn(dependenciesScanner, "scanModulesForDependencies").mockResolvedValue(undefined);
      spyOn(instanceLoader, "createInstancesOfDependencies").mockResolvedValue(undefined);

      await lazyModuleLoader.load(loaderFn, { logger: false });

      expect(instanceLoader.setLogger).toHaveBeenCalledWith(expect.any(Object));
    });

    it("should not configure logger when logger option is not specified", async () => {
      const loaderFn = mock(() => TestModule);
      const mockModule = {
        token: "test-token",
        getProviderByKey: mock(() => ({
          instance: { test: "moduleRef" },
        })),
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      spyOn(dependenciesScanner, "scanForModules").mockResolvedValue([mockModule]);
      spyOn(dependenciesScanner, "scanModulesForDependencies").mockResolvedValue(undefined);
      spyOn(instanceLoader, "createInstancesOfDependencies").mockResolvedValue(undefined);

      await lazyModuleLoader.load(loaderFn);

      expect(instanceLoader.setLogger).not.toHaveBeenCalled();
    });

    it("should handle dynamic module definition", async () => {
      const dynamicModule = {
        module: TestModule,
        providers: [TestProvider],
      };
      const loaderFn = mock(() => dynamicModule);
      const mockModule = {
        token: "test-token",
        getProviderByKey: mock(() => ({
          instance: { test: "dynamicModuleRef" },
        })),
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      spyOn(dependenciesScanner, "scanForModules").mockResolvedValue([mockModule]);
      spyOn(dependenciesScanner, "scanModulesForDependencies").mockResolvedValue(undefined);
      spyOn(instanceLoader, "createInstancesOfDependencies").mockResolvedValue(undefined);

      const result = await lazyModuleLoader.load(loaderFn);

      expect(dependenciesScanner.scanForModules).toHaveBeenCalledWith({
        moduleDefinition: dynamicModule,
        overrides: moduleOverrides,
        lazy: true,
      });
      // @ts-expect-error Mismatch types
      expect(result).toEqual({ test: "dynamicModuleRef" });
    });

    it("should deduplicate module instances when creating lazy modules container", async () => {
      const loaderFn = mock(() => TestModule);
      const mockModule1 = {
        token: "test-token-1",
        getProviderByKey: mock(() => ({
          instance: { test: "moduleRef1" },
        })),
      } as any;
      const mockModule2 = {
        token: "test-token-2",
        getProviderByKey: mock(() => ({
          instance: { test: "moduleRef2" },
        })),
      } as any;

      // Add duplicate module to test deduplication
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      spyOn(dependenciesScanner, "scanForModules").mockResolvedValue([mockModule1, mockModule2, mockModule1]);
      spyOn(dependenciesScanner, "scanModulesForDependencies").mockResolvedValue(undefined);
      spyOn(instanceLoader, "createInstancesOfDependencies").mockResolvedValue(undefined);

      await lazyModuleLoader.load(loaderFn);

      expect(dependenciesScanner.scanModulesForDependencies).toHaveBeenCalledWith(
        expect.any(Map)
      );

      const containerArg = (dependenciesScanner.scanModulesForDependencies as any).mock.calls[0][0];
      expect(containerArg.size).toBe(2); // Should have deduplicated
      expect(containerArg.has("test-token-1")).toBe(true);
      expect(containerArg.has("test-token-2")).toBe(true);
    });
  });
});