import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { CoreModule, Injector, InstanceWrapper, Scope, STATIC_CONTEXT, VenokContainer } from "@venok/core";

import { TestingInjector } from "~/testing/injector.js";

describe("TestingInjector", () => {
  let testingInjector: TestingInjector;
  let mockContainer: VenokContainer;
  let mockCoreModule: CoreModule;
  let mockInstanceWrapper: InstanceWrapper;

  beforeEach(() => {
    testingInjector = new TestingInjector();
    mockContainer = new VenokContainer();
    mockCoreModule = new CoreModule(class TestModule {}, mockContainer);
    mockInstanceWrapper = new InstanceWrapper({
      name: "TestService",
      metatype: class TestService {},
      instance: null,
      isResolved: false,
    });
  });

  describe("setMocker", () => {
    it("should set the mocker function", () => {
      const mockFactory = mock();
      testingInjector.setMocker(mockFactory);
      
      expect((testingInjector as any).mocker).toBe(mockFactory);
    });
  });

  describe("setContainer", () => {
    it("should set the container", () => {
      testingInjector.setContainer(mockContainer);
      
      expect((testingInjector as any).container).toBe(mockContainer);
    });
  });

  describe("resolveComponentWrapper", () => {
    beforeEach(() => {
      testingInjector.setContainer(mockContainer);
    });

    describe("when super.resolveComponentWrapper succeeds", () => {
      it("should return the resolved wrapper from parent injector", async () => {
        const expectedWrapper = new InstanceWrapper({
          name: "ResolvedService",
          instance: {},
          isResolved: true,
        });

        const superResolveComponentWrapper = spyOn(
          Injector.prototype, 
          "resolveComponentWrapper"
        ).mockResolvedValue(expectedWrapper);

        const result = await testingInjector.resolveComponentWrapper(
          mockCoreModule,
          "TestService",
          { index: 0, dependencies: [] },
          mockInstanceWrapper
        );

        expect(superResolveComponentWrapper).toHaveBeenCalledWith(
          mockCoreModule,
          "TestService",
          { index: 0, dependencies: [] },
          mockInstanceWrapper,
          STATIC_CONTEXT,
          undefined,
          undefined
        );
        expect(result).toBe(expectedWrapper);
      });
    });

    describe("when super.resolveComponentWrapper fails", () => {
      it("should call mockWrapper when error is thrown and mocker is set", async () => {
        const error = new Error("Dependency not found");
        const mockedInstance = { mocked: true };
        const mockFactory = mock(() => mockedInstance);
        
        testingInjector.setMocker(mockFactory);

        spyOn(Injector.prototype, "resolveComponentWrapper").mockRejectedValue(error);
        
        const mockInternalCoreModule = {
          addCustomProvider: mock(),
          addExportedProviderOrModule: mock(),
          providers: new Map(),
        };
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        spyOn(mockContainer, "getInternalCoreModuleRef").mockReturnValue(mockInternalCoreModule as any);

        const result = await testingInjector.resolveComponentWrapper(
          mockCoreModule,
          "TestService",
          { index: 0, dependencies: [] },
          mockInstanceWrapper
        );

        expect(mockFactory).toHaveBeenCalledWith("TestService");
        expect(result).toBeInstanceOf(InstanceWrapper);
        expect(result.instance).toBe(mockedInstance);
        expect(result.getInstanceByContextId(STATIC_CONTEXT).isResolved).toBe(true);
        expect(mockInternalCoreModule.addCustomProvider).toHaveBeenCalledWith(
          { provide: "TestService", useValue: mockedInstance },
          mockInternalCoreModule.providers
        );
        expect(mockInternalCoreModule.addExportedProviderOrModule).toHaveBeenCalledWith("TestService");
      });

      it("should throw original error when no mocker is set", async () => {
        const error = new Error("Dependency not found");
        spyOn(Injector.prototype, "resolveComponentWrapper").mockRejectedValue(error);

        expect(testingInjector.resolveComponentWrapper(
          mockCoreModule,
          "TestService",
          { index: 0, dependencies: [] },
          mockInstanceWrapper
        )).rejects.toThrow(error);
      });

      it("should throw original error when mocker returns null", async () => {
        const error = new Error("Dependency not found");
        const mockFactory = mock(() => null);
        
        testingInjector.setMocker(mockFactory);
        spyOn(Injector.prototype, "resolveComponentWrapper").mockRejectedValue(error);

        expect(testingInjector.resolveComponentWrapper(
          mockCoreModule,
          "TestService",
          { index: 0, dependencies: [] },
          mockInstanceWrapper
        )).rejects.toThrow(error);
      });

      it("should throw original error when mocker returns undefined", async () => {
        const error = new Error("Dependency not found");
        const mockFactory = mock(() => undefined);
        
        testingInjector.setMocker(mockFactory);
        spyOn(Injector.prototype, "resolveComponentWrapper").mockRejectedValue(error);

        expect(testingInjector.resolveComponentWrapper(
          mockCoreModule,
          "TestService",
          { index: 0, dependencies: [] },
          mockInstanceWrapper
        )).rejects.toThrow(error);
      });

      it("should throw error when internal core module is not available", async () => {
        const error = new Error("Dependency not found");
        const mockFactory = mock(() => ({ mocked: true }));
        
        testingInjector.setMocker(mockFactory);
        spyOn(Injector.prototype, "resolveComponentWrapper").mockRejectedValue(error);
        spyOn(mockContainer, "getInternalCoreModuleRef").mockReturnValue(undefined);

        expect(testingInjector.resolveComponentWrapper(
          mockCoreModule,
          "TestService",
          { index: 0, dependencies: [] },
          mockInstanceWrapper
        )).rejects.toThrow("Expected to have internal core module reference at this point.");
      });
    });
  });

  describe("resolveComponentHost", () => {
    beforeEach(() => {
      testingInjector.setContainer(mockContainer);
    });

    describe("when super.resolveComponentHost succeeds", () => {
      it("should return the resolved wrapper from parent injector", async () => {
        const expectedWrapper = new InstanceWrapper({
          name: "ResolvedService",
          instance: {},
          isResolved: true,
        });

        const superResolveComponentHost = spyOn(
          Injector.prototype, 
          "resolveComponentHost"
        ).mockResolvedValue(expectedWrapper);

        const result = await testingInjector.resolveComponentHost(
          mockCoreModule,
          mockInstanceWrapper
        );

        expect(superResolveComponentHost).toHaveBeenCalledWith(
          mockCoreModule,
          mockInstanceWrapper,
          STATIC_CONTEXT,
          undefined
        );
        expect(result).toBe(expectedWrapper);
      });
    });

    describe("when super.resolveComponentHost fails", () => {
      it("should call mockWrapper when error is thrown and mocker is set", async () => {
        const error = new Error("Component not found");
        const mockedInstance = { mocked: true };
        const mockFactory = mock(() => mockedInstance);
        
        testingInjector.setMocker(mockFactory);

        spyOn(Injector.prototype, "resolveComponentHost").mockRejectedValue(error);
        
        const mockInternalCoreModule = {
          addCustomProvider: mock(),
          addExportedProviderOrModule: mock(),
          providers: new Map(),
        };
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        spyOn(mockContainer, "getInternalCoreModuleRef").mockReturnValue(mockInternalCoreModule as any);

        const result = await testingInjector.resolveComponentHost(
          mockCoreModule,
          mockInstanceWrapper
        );

        expect(mockFactory).toHaveBeenCalledWith(mockInstanceWrapper.name);
        expect(result).toBeInstanceOf(InstanceWrapper);
        expect(result.instance).toBe(mockedInstance);
        expect(result.getInstanceByContextId(STATIC_CONTEXT).isResolved).toBe(true);
        expect(mockInternalCoreModule.addCustomProvider).toHaveBeenCalledWith(
          { provide: mockInstanceWrapper.name, useValue: mockedInstance },
          mockInternalCoreModule.providers
        );
        expect(mockInternalCoreModule.addExportedProviderOrModule).toHaveBeenCalledWith(mockInstanceWrapper.name);
      });

      it("should throw original error when no mocker is set", async () => {
        const error = new Error("Component not found");
        spyOn(Injector.prototype, "resolveComponentHost").mockRejectedValue(error);

        expect(testingInjector.resolveComponentHost(
          mockCoreModule,
          mockInstanceWrapper
        )).rejects.toThrow(error);
      });
    });
  });

  describe("mockWrapper", () => {
    let mockInternalCoreModule: any;

    beforeEach(() => {
      testingInjector.setContainer(mockContainer);
      mockInternalCoreModule = {
        addCustomProvider: mock(),
        addExportedProviderOrModule: mock(),
        providers: new Map(),
      };
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      spyOn(mockContainer, "getInternalCoreModuleRef").mockReturnValue(mockInternalCoreModule);
    });

    it("should create a new wrapper with mocked instance", async () => {
      const error = new Error("Test error");
      const mockedInstance = { mocked: true };
      const mockFactory = mock(() => mockedInstance);
      
      testingInjector.setMocker(mockFactory);

      const result = await (testingInjector as any).mockWrapper(
        error,
        mockCoreModule,
        "TestService",
        mockInstanceWrapper
      );

      expect(mockFactory).toHaveBeenCalledWith("TestService");
      expect(result).toBeInstanceOf(InstanceWrapper);
      expect(result.name).toBe("TestService");
      expect(result.instance).toBe(mockedInstance);
      expect(result.getInstanceByContextId(STATIC_CONTEXT).isResolved).toBe(true);
      expect(result.host).toBe(mockCoreModule);
      expect(result.metatype).toBe(mockInstanceWrapper.metatype);
      expect(result.scope).toBe(mockInstanceWrapper.scope);
    });

    it("should add the mocked instance to the internal core module", async () => {
      const error = new Error("Test error");
      const mockedInstance = { mocked: true };
      const mockFactory = mock(() => mockedInstance);
      
      testingInjector.setMocker(mockFactory);

      await (testingInjector as any).mockWrapper(
        error,
        mockCoreModule,
        "TestService",
        mockInstanceWrapper
      );

      expect(mockInternalCoreModule.addCustomProvider).toHaveBeenCalledWith(
        { provide: "TestService", useValue: mockedInstance },
        mockInternalCoreModule.providers
      );
      expect(mockInternalCoreModule.addExportedProviderOrModule).toHaveBeenCalledWith("TestService");
    });

    it("should preserve wrapper properties in the new wrapper", async () => {
      const error = new Error("Test error");
      const mockedInstance = { mocked: true };
      const mockFactory = mock(() => mockedInstance);
      
      testingInjector.setMocker(mockFactory);

      const customWrapper = new InstanceWrapper({
        name: "CustomService",
        metatype: class CustomService {},
        scope: Scope.DEFAULT,
        instance: null,
        isResolved: false,
      });

      const result = await (testingInjector as any).mockWrapper(
        error,
        mockCoreModule,
        "CustomService",
        customWrapper
      );

      expect(result.scope).toBe(Scope.DEFAULT);
      expect(result.metatype).toBe(customWrapper.metatype);
    });
  });

  describe("integration scenarios", () => {
    let moduleWithDeps: CoreModule;
    let serviceWrapper: InstanceWrapper;
    let dependencyWrapper: InstanceWrapper;

    beforeEach(() => {
      testingInjector.setContainer(mockContainer);
      
      moduleWithDeps = new CoreModule(class ModuleWithDeps {}, mockContainer);
      
      serviceWrapper = new InstanceWrapper({
        name: "ServiceWithDeps",
        metatype: class ServiceWithDeps {},
        instance: null,
        isResolved: false,
      });
      
      dependencyWrapper = new InstanceWrapper({
        name: "Dependency",
        metatype: class Dependency {},
        instance: null,
        isResolved: false,
      });

      moduleWithDeps.providers.set("ServiceWithDeps", serviceWrapper);
      moduleWithDeps.providers.set("Dependency", dependencyWrapper);
    });

    it("should successfully mock dependencies when resolution fails", async () => {
      const mockedDependency = { mocked: "dependency" };
      const mockFactory = mock((token) => {
        if (token === "Dependency") return mockedDependency;
        return null;
      });
      
      testingInjector.setMocker(mockFactory);
      
      const mockInternalCoreModule = {
        addCustomProvider: mock(),
        addExportedProviderOrModule: mock(),
        providers: new Map(),
      };
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      spyOn(mockContainer, "getInternalCoreModuleRef").mockReturnValue(mockInternalCoreModule as any);

      spyOn(Injector.prototype, "resolveComponentWrapper").mockImplementation((moduleRef, name, depContext, wrapper) => {
        if (name === "Dependency") throw new Error("Dependency not found");

        return Promise.resolve(wrapper);
      });

      const result = await testingInjector.resolveComponentWrapper(
        moduleWithDeps,
        "Dependency",
        { index: 0, dependencies: [] },
        dependencyWrapper
      );

      expect(mockFactory).toHaveBeenCalledWith("Dependency");
      expect(result.instance).toBe(mockedDependency);
      expect(mockInternalCoreModule.addCustomProvider).toHaveBeenCalledWith(
        { provide: "Dependency", useValue: mockedDependency },
        mockInternalCoreModule.providers
      );
    });
  });
});