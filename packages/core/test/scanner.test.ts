import type { ModuleOverride } from "~/interfaces/modules/override.interface.js";

import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

import { DependenciesScanner } from "~/scanner.js";
import { Injectable } from "~/decorators/injectable.decorator.js";
import { Catch } from "~/decorators/catch.decorator.js";
import { Module } from "~/decorators/module.decorator.js";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE, GUARDS_METADATA, ROUTE_ARGS_METADATA } from "~/constants.js";
import { UndefinedModuleException } from "~/errors/exceptions/undefined-module.exception.js";
import { InvalidModuleException } from "~/errors/exceptions/invalid-module.exception.js";
import { InstanceWrapper } from "~/injector/instance/wrapper.js";
import { Scope } from "~/enums/scope.enum.js";
import { InvalidClassModuleException } from "~/errors/exceptions/invalid-class-module.exception.js";
import { UseGuards } from "~/decorators/use-guards.decorator.js";
import { MetadataScanner } from "~/metadata-scanner.js";
import { ApplicationConfig } from "~/application/config.js";
import { GraphInspector } from "~/inspector/graph-inspector.js";
import { VenokContainer } from "~/injector/container.js";
import { TopologyTree } from "~/injector/topology-tree/topology-tree.js";

describe("DependenciesScanner", () => {
  class Guard {}

  @Injectable()
  class TestComponent {}

  @Catch()
  class TestExceptionFilterWithoutInjectable {}
  
  @Module({
    providers: [TestComponent],
    exports: [TestComponent],
  })
  class BasicModule {}

  @Module({
    imports: [BasicModule],
    providers: [TestComponent],
  })
  class TestModule {}

  @Module({
    imports: [undefined!],
  })
  class UndefinedModule {}

  @Module({
    imports: [null!],
  })
  class InvalidModule {}

  let scanner: DependenciesScanner;
  let untypedScanner: any;
  let container: VenokContainer;
  let graphInspector: GraphInspector;
  let spies: Array<any> = [];

  beforeEach(() => {
    container = new VenokContainer();
    graphInspector = new GraphInspector(container);

    scanner = new DependenciesScanner(
      container,
      new MetadataScanner(),
      graphInspector,
      new ApplicationConfig()
    );
    untypedScanner = scanner as any;
    spies.push(spyOn(scanner, "registerCoreModule").mockImplementation(async () => {}));
  });

  afterEach(() => {
    spies.forEach(spy => spy.mockRestore());
    spies = [];
  });

  it('should "insertOrOverrideModule" call twice (2 modules) container method "addModule"', async () => {
    const addModuleSpy = spyOn(container, "addModule").mockImplementation(() => ({} as any));
    const replaceModuleSpy = spyOn(container, "replaceModule").mockImplementation(() => ({} as any));
    spies.push(addModuleSpy, replaceModuleSpy);

    await scanner.scan(TestModule);
    expect(addModuleSpy).toHaveBeenCalledTimes(2);
    expect(replaceModuleSpy).toHaveBeenCalledTimes(0);
  });

  it('should "insertProvider" call twice (2 components) container method "addProvider"', async () => {
    const addProviderSpy = spyOn(container, "addProvider").mockImplementation(() => ({} as any));
    const insertExportedSpy = spyOn(scanner, "insertExportedProviderOrModule").mockImplementation(() => {});
    spies.push(addProviderSpy, insertExportedSpy);

    await scanner.scan(TestModule);
    expect(addProviderSpy).toHaveBeenCalledTimes(2);
  });

  it('should "insertExportedProviderOrModule" call once (1 component) container method "addExportedProviderOrModule"', async () => {
    const addExportedSpy = spyOn(container, "addExportedProviderOrModule").mockImplementation(() => {});
    spies.push(addExportedSpy);
    
    await scanner.scan(TestModule);
    expect(addExportedSpy).toHaveBeenCalledTimes(1);
  });

  describe("when there is modules overrides", () => {
    @Injectable()
    class OverwrittenTestComponent {}

    @Module({
      providers: [OverwrittenTestComponent],
    })
    class OverwrittenModuleOne {}

    @Module({
      imports: [OverwrittenModuleOne],
    })
    class OverrideTestModule {}

    @Injectable()
    class OverrideTestComponent {}
    
    @Module({
      providers: [OverrideTestComponent],
    })
    class OverrideModuleOne {}
    
    const modulesToOverride: ModuleOverride[] = [{ moduleToReplace: OverwrittenModuleOne, newModule: OverrideModuleOne }];

    it('should "putModule" call twice (2 modules) container method "replaceModule"', async () => {
      const replaceModuleSpy = spyOn(container, "replaceModule").mockImplementation(() => ({} as any));
      const addModuleSpy = spyOn(container, "addModule").mockImplementation(() => ({} as any));
      spies.push(replaceModuleSpy, addModuleSpy);

      await scanner.scan(OverrideTestModule, {
        overrides: modulesToOverride,
      });

      expect(replaceModuleSpy).toHaveBeenCalledTimes(1);
      expect(replaceModuleSpy).toHaveBeenCalledWith(OverwrittenModuleOne, OverrideModuleOne, expect.any(Array));
      expect(addModuleSpy).toHaveBeenCalledTimes(1);
    });

    it('should "insertProvider" call once container method "addProvider"', async () => {
      const addProviderSpy = spyOn(container, "addProvider").mockImplementation(() => ({} as any));
      spies.push(addProviderSpy);

      await scanner.scan(OverrideTestModule);
      expect(addProviderSpy).toHaveBeenCalledTimes(1);
    });

    it('should "putModule" call container method "replaceModule" with forwardRef() when forwardRef property exists', async () => {
      const overwrittenForwardRefSpy = mock(() => {});

      @Module({})
      class OverwrittenForwardRef {}

      @Module({})
      class Overwritten {
        public static forwardRef() {
          overwrittenForwardRefSpy();
          return OverwrittenForwardRef;
        }
      }

      const overrideForwardRefSpy = mock(() => {});

      @Module({})
      class OverrideForwardRef {}

      @Module({})
      class Override {
        public static forwardRef() {
          overrideForwardRefSpy();
          return OverrideForwardRef;
        }
      }

      @Module({
        imports: [Overwritten],
      })
      class OverrideForwardRefTestModule {}

      await scanner.scan(OverrideForwardRefTestModule, {
        overrides: [
          {
            moduleToReplace: Overwritten,
            newModule: Override,
          },
        ],
      });

      expect(overwrittenForwardRefSpy).toHaveBeenCalled();
      expect(overrideForwardRefSpy).toHaveBeenCalled();
    });
  });

  describe("reflectDynamicMetadata", () => {
    describe("when param has prototype", () => {
      it('should call "reflectParamInjectables" and "reflectInjectables"', () => {
        const reflectInjectables = spyOn(scanner, "reflectInjectables").mockImplementation(() => undefined);
        const reflectParamInjectables = spyOn(scanner, "reflectParamInjectables").mockImplementation(() => undefined);
        spies.push(reflectInjectables, reflectParamInjectables);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        scanner.reflectDynamicMetadata({ prototype: true } as any, "");
        expect(reflectInjectables).toHaveBeenCalled();
        expect(reflectParamInjectables).toHaveBeenCalled();
      });
    });
    describe("when param has not prototype", () => {
      it('should not call ""reflectParamInjectables" and "reflectInjectables"', () => {
        const reflectInjectables = spyOn(scanner, "reflectInjectables").mockImplementation(() => undefined);
        const reflectParamInjectables = spyOn(scanner, "reflectParamInjectables").mockImplementation(() => undefined);
        spies.push(reflectInjectables, reflectParamInjectables);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        scanner.reflectDynamicMetadata({} as any, "");

        expect(reflectInjectables).not.toHaveBeenCalled();
        expect(reflectParamInjectables).not.toHaveBeenCalled();
      });
    });
  });

  describe("insertInjectable", () => {
    class InjectableCls {}
    class HostCls {}

    const instanceWrapper = { id: "random_id" };
    const token = "token";
    const methodKey = "methodKey";

    let addInjectableStub: any;
    let insertEnhancerMetadataCacheStub: any;

    beforeEach(() => {
      addInjectableStub = spyOn(untypedScanner.container, "addInjectable").mockImplementation(() => instanceWrapper);
      insertEnhancerMetadataCacheStub = spyOn(graphInspector, "insertEnhancerMetadataCache").mockImplementation(() => undefined);
      spies.push(addInjectableStub, insertEnhancerMetadataCacheStub);
    });

    describe("when injectable is of type function", () => {
      const subtype = "filter";
      beforeEach(() => {
        scanner.insertInjectable(
          InjectableCls,
          token,
          HostCls,
          subtype,
          methodKey
        );
      });

      it('should call "addInjectable"', () => {
        expect(addInjectableStub).toHaveBeenCalledWith(InjectableCls, token, subtype, HostCls);
      });

      it('should call "insertEnhancerMetadataCache"', () => {
        expect(insertEnhancerMetadataCacheStub).toHaveBeenCalledWith({
          moduleToken: token,
          classRef: HostCls,
          enhancerInstanceWrapper: instanceWrapper,
          targetNodeId: instanceWrapper.id,
          methodKey,
          subtype,
        });
      });
    });
    describe("when injectable is not of type function", () => {
      const injectableRef = new InjectableCls();
      const subtype = "interceptor";

      beforeEach(() => {
        scanner.insertInjectable(
          injectableRef,
          token,
          HostCls,
          subtype,
          methodKey
        );
      });

      it('should not call "addInjectable"', () => {
        expect(addInjectableStub).not.toHaveBeenCalled();
      });

      it('should call "insertEnhancerMetadataCache"', () => {
        expect(insertEnhancerMetadataCacheStub).toHaveBeenCalledWith({
          moduleToken: token,
          classRef: HostCls,
          enhancerRef: injectableRef,
          methodKey,
          subtype,
        });
      });
    });
  });

  class CompMethod {
    @UseGuards(Guard)
    public method() {}

    @UseGuards(Guard, Guard)
    public method2() {}
  }
  describe("reflectKeyMetadata", () => {
    it("should return undefined", () => {
      const result = scanner.reflectKeyMetadata(TestComponent, "key", "method");
      expect(result).toBeUndefined();
    });
    it("should return an array that consists of 1 element", () => {
      const methodKey = "method";
      const result = scanner.reflectKeyMetadata(
        CompMethod,
        GUARDS_METADATA,
        methodKey
      );
      expect(result).toEqual({ methodKey, metadata: [Guard] });
    });
    it("should return an array that consists of 2 elements", () => {
      const methodKey = "method2";
      const result = scanner.reflectKeyMetadata(
        CompMethod,
        GUARDS_METADATA,
        methodKey
      );
      expect(result).toEqual({ methodKey, metadata: [Guard, Guard] });
    });
  });

  describe("insertModule", () => {
    it("should call forwardRef() when forwardRef property exists", async () => {
      const addModuleSpy = spyOn(container, "addModule").mockImplementation(() => ({} as any));
      spies.push(addModuleSpy);

      const forwardRefMock = mock(() => class {});
      const module = { forwardRef: forwardRefMock };
      await scanner.insertModule(module, []);

      expect(forwardRefMock).toHaveBeenCalled();
    });
    it('should throw "InvalidClassModuleException" exception when supplying a class annotated with `@Injectable()` decorator', () => {
      const addModuleSpy = spyOn(container, "addModule").mockImplementation(() => ({} as any));
      spies.push(addModuleSpy);

      expect(scanner.insertModule(TestComponent, [])).rejects.toThrow(InvalidClassModuleException);
    });

    it('should throw "InvalidClassModuleException" exception when supplying a class annotated with (only) `@Catch()` decorator', () => {
      const addModuleSpy = spyOn(container, "addModule").mockImplementation(() => ({} as any));
      spies.push(addModuleSpy);

      expect(
        scanner.insertModule(TestExceptionFilterWithoutInjectable, [])
      ).rejects.toThrow(InvalidClassModuleException);
    });
  });

  describe("insertImport", () => {
    it("should call forwardRef() when forwardRef property exists", async () => {
      const forwardRefMock = mock(() => ({}));
      const module = { forwardRef: forwardRefMock };
      const addImportSpy = spyOn(container, "addImport").mockImplementation(() => ({} as any));
      spies.push(addImportSpy);

      // @ts-expect-error Mismatch types
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await scanner.insertImport(module, [] as any, "test");
      expect(forwardRefMock).toHaveBeenCalled();
    });
    describe('when "related" is nil', () => {
      it("should throw exception", async () => {
        let error;
        try {
          // @ts-expect-error Mismatch types
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          await scanner.insertImport(undefined, [] as any, "test");
        } catch (e) {
          error = e;
        }
        expect(error).toBeDefined();
      });
    });
  });

  describe("insertProvider", () => {
    const token = "token";

    describe("when provider is not custom", () => {
      it('should call container "addProvider" with expected args', () => {
        const provider = {};
        // @ts-expect-error Mismatch types
        const addProviderSpy = spyOn(container, "addProvider").mockImplementation(() => false);
        spies.push(addProviderSpy);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        scanner.insertProvider(provider as any, token);

        expect(addProviderSpy).toHaveBeenCalledWith(provider, token);
      });
    });
    describe("when provider is custom", () => {
      describe("and is global", () => {
        const provider = {
          provide: APP_INTERCEPTOR,
          useValue: true,
        };

        it('should call container "addProvider" with expected args', () => {
          // @ts-expect-error Mismatch types
          const addProviderSpy = spyOn(container, "addProvider").mockImplementation(() => false);
          spies.push(addProviderSpy);

          scanner.insertProvider(provider, token);

          expect(addProviderSpy).toHaveBeenCalledTimes(1);
        });
        it('should push new object to "applicationProvidersApplyMap" array', () => {
          // @ts-expect-error Mismatch types
          const addProviderSpy = spyOn(container, "addProvider").mockImplementation(() => false);
          spies.push(addProviderSpy);
          
          scanner.insertProvider(provider, token);
          const applyMap = untypedScanner.applicationProvidersApplyMap;

          expect(applyMap).toHaveLength(1);
          expect(applyMap[0].moduleKey).toEqual(token);
        });
      });
      describe("and is global and request/transient scoped", () => {
        const provider = {
          provide: APP_INTERCEPTOR,
          useValue: true,
          scope: Scope.REQUEST,
        };
        it('should call container "addInjectable" with expected args', () => {
          // @ts-expect-error Mismatch types
          const addInjectableSpy = spyOn(container, "addInjectable").mockImplementation(() => false);
          spies.push(addInjectableSpy);

          scanner.insertProvider(provider, token);

          expect(addInjectableSpy).toHaveBeenCalledTimes(1);
        });
      });
      describe("and is not global", () => {
        const component = {
          provide: "CUSTOM",
          useValue: true,
        };
        it('should call container "addProvider" with expected args', () => {
          // @ts-expect-error Mismatch types
          const addProviderSpy = spyOn(container, "addProvider").mockImplementation(() => false);
          spies.push(addProviderSpy);

          scanner.insertProvider(component, token);

          expect(addProviderSpy).toHaveBeenCalledWith(component, token);
        });
        it('should not push new object to "applicationProvidersApplyMap" array', () => {
          expect(untypedScanner.applicationProvidersApplyMap).toHaveLength(0);

          // @ts-expect-error Mismatch types
          const addProviderSpy = spyOn(container, "addProvider").mockImplementation(() => false);
          spies.push(addProviderSpy);
          
          scanner.insertProvider(component, token);
          expect(untypedScanner.applicationProvidersApplyMap).toHaveLength(0);
        });
      });
    });
  });
  describe("applyApplicationProviders", () => {
    it("should apply each provider", () => {
      const provider = {
        moduleKey: "moduleToken",
        providerKey: "providerToken",
        type: APP_GUARD,
      };
      untypedScanner.applicationProvidersApplyMap = [provider];

      const expectedInstance = {};
      const instanceWrapper = {
        instance: expectedInstance,
      } as unknown as InstanceWrapper;
      
      const getModulesSpy = spyOn(container, "getModules").mockImplementation(() => ({
        get: () => ({
          // @ts-expect-error Mismatch types
          providers: { get: () => instanceWrapper },
        }),
      }));

      const applySpy = mock(() => {});
      const getApplyProvidersSpy = spyOn(scanner, "getApplyProvidersMap").mockImplementation(() => ({
        [provider.type]: applySpy,
      }));

      const insertAttachedEnhancerSpy = spyOn(
        graphInspector,
        "insertAttachedEnhancer"
      ).mockImplementation(() => undefined);
      
      spies.push(getModulesSpy, getApplyProvidersSpy, insertAttachedEnhancerSpy);

      scanner.applyApplicationProviders();

      expect(applySpy).toHaveBeenCalled();
      expect(applySpy).toHaveBeenCalledWith(expectedInstance);
      expect(insertAttachedEnhancerSpy).toHaveBeenCalledWith(instanceWrapper);
    });
    it("should apply each globally scoped provider", () => {
      const provider = {
        moduleKey: "moduleToken",
        providerKey: "providerToken",
        type: APP_GUARD,
        scope: Scope.REQUEST,
      };
      untypedScanner.applicationProvidersApplyMap = [provider];

      const expectedInstanceWrapper = new InstanceWrapper();
      const getModulesSpy = spyOn(container, "getModules").mockImplementation(() => ({
        get: () => ({
          // @ts-expect-error Mismatch types
          injectables: { get: () => expectedInstanceWrapper },
        }),
      }));

      const applySpy = mock(() => {});
      const getApplyRequestProvidersSpy = spyOn(scanner, "getApplyRequestProvidersMap").mockImplementation(() => ({
        [provider.type]: applySpy,
      }));

      const insertAttachedEnhancerSpy = spyOn(
        graphInspector,
        "insertAttachedEnhancer"
      ).mockImplementation(() => undefined);
      
      spies.push(getModulesSpy, getApplyRequestProvidersSpy, insertAttachedEnhancerSpy);

      scanner.applyApplicationProviders();

      expect(applySpy).toHaveBeenCalled();
      expect(applySpy).toHaveBeenCalledWith(expectedInstanceWrapper);
      expect(insertAttachedEnhancerSpy).toHaveBeenCalledWith(expectedInstanceWrapper);
    });
  });

  describe("getApplyProvidersMap", () => {
    describe(`when token is ${APP_INTERCEPTOR}`, () => {
      it('call "addGlobalInterceptor"', () => {
        const addSpy = spyOn(
          untypedScanner.applicationConfig,
          "addGlobalInterceptor"
        ).mockImplementation(() => {});
        spies.push(addSpy);
        
        scanner.getApplyProvidersMap()[APP_INTERCEPTOR](null);
        expect(addSpy).toHaveBeenCalled();
      });
    });
    describe(`when token is ${APP_GUARD}`, () => {
      it('call "addGlobalGuard"', () => {
        const addSpy = spyOn(
          untypedScanner.applicationConfig,
          "addGlobalGuard"
        ).mockImplementation(() => {});
        spies.push(addSpy);
        
        scanner.getApplyProvidersMap()[APP_GUARD](null);
        expect(addSpy).toHaveBeenCalled();
      });
    });
    describe(`when token is ${APP_PIPE}`, () => {
      it('call "addGlobalPipe"', () => {
        const addSpy = spyOn(
          untypedScanner.applicationConfig,
          "addGlobalPipe"
        ).mockImplementation(() => {});
        spies.push(addSpy);
        
        scanner.getApplyProvidersMap()[APP_PIPE](null);
        expect(addSpy).toHaveBeenCalled();
      });
    });
    describe(`when token is ${APP_FILTER}`, () => {
      it('call "addGlobalFilter"', () => {
        const addSpy = spyOn(
          untypedScanner.applicationConfig,
          "addGlobalFilter"
        ).mockImplementation(() => {});
        spies.push(addSpy);
        
        scanner.getApplyProvidersMap()[APP_FILTER](null);
        expect(addSpy).toHaveBeenCalled();
      });
    });
  });
  describe("getApplyRequestProvidersMap", () => {
    describe(`when token is ${APP_INTERCEPTOR}`, () => {
      it('call "addGlobalRequestInterceptor"', () => {
        const addSpy = spyOn(
          untypedScanner.applicationConfig,
          "addGlobalRequestInterceptor"
        ).mockImplementation(() => {});
        spies.push(addSpy);
        
        scanner.getApplyRequestProvidersMap()[APP_INTERCEPTOR](null);
        expect(addSpy).toHaveBeenCalled();
      });
    });
    describe(`when token is ${APP_GUARD}`, () => {
      it('call "addGlobalRequestGuard"', () => {
        const addSpy = spyOn(
          untypedScanner.applicationConfig,
          "addGlobalRequestGuard"
        ).mockImplementation(() => {});
        spies.push(addSpy);
        
        scanner.getApplyRequestProvidersMap()[APP_GUARD](null);
        expect(addSpy).toHaveBeenCalled();
      });
    });
    describe(`when token is ${APP_PIPE}`, () => {
      it('call "addGlobalRequestPipe"', () => {
        const addSpy = spyOn(
          untypedScanner.applicationConfig,
          "addGlobalRequestPipe"
        ).mockImplementation(() => {});
        spies.push(addSpy);
        
        scanner.getApplyRequestProvidersMap()[APP_PIPE](null);
        expect(addSpy).toHaveBeenCalled();
      });
    });
    describe(`when token is ${APP_FILTER}`, () => {
      it('call "addGlobalRequestFilter"', () => {
        const addSpy = spyOn(
          untypedScanner.applicationConfig,
          "addGlobalRequestFilter"
        ).mockImplementation(() => {});
        spies.push(addSpy);
        
        scanner.getApplyRequestProvidersMap()[APP_FILTER](null);
        expect(addSpy).toHaveBeenCalled();
      });
    });
  });
  describe("scanForModules", () => {
    it("should throw an exception when the imports array includes undefined", async () => {
      try {
        await scanner.scanForModules({
          moduleDefinition: UndefinedModule,
          scope: [UndefinedModule],
        });
      } catch (exception) {
        expect(exception instanceof UndefinedModuleException).toBe(true);
      }
    });
    it("should throw an exception when the imports array includes an invalid value", async () => {
      try {
        await scanner.scanForModules({
          moduleDefinition: InvalidModule,
          scope: [InvalidModule],
        });
      } catch (exception) {
        expect(exception instanceof InvalidModuleException).toBe(true);
      }
    });
  });

  describe("reflectInjectables", () => {
    class TestInjectable {}
    
    @Injectable()
    class ComponentWithMethodMetadata {
      @UseGuards(TestInjectable)
      public methodWithGuard() {}
      
      public methodWithoutMetadata() {}
    }

    it("should handle method injectables when reflectKeyMetadata returns metadata", () => {
      const getAllMethodNamesSpy = spyOn(untypedScanner.metadataScanner, "getAllMethodNames").mockImplementation(() => ["methodWithGuard", "methodWithoutMetadata"]);
      const reflectMetadataSpy = spyOn(scanner, "reflectMetadata").mockImplementation(() => []);
      const reflectKeyMetadataSpy = spyOn(scanner, "reflectKeyMetadata")
        .mockImplementationOnce(() => ({ methodKey: "methodWithGuard", metadata: [TestInjectable] }))
        .mockImplementationOnce(() => undefined);
      // @ts-expect-error Mismatch types
      const insertInjectableSpy = spyOn(scanner, "insertInjectable").mockImplementation(() => {});
      spies.push(getAllMethodNamesSpy, reflectMetadataSpy, reflectKeyMetadataSpy, insertInjectableSpy);

      scanner.reflectInjectables(ComponentWithMethodMetadata, "token", GUARDS_METADATA);

      expect(insertInjectableSpy).toHaveBeenCalledWith(
        TestInjectable,
        "token",
        ComponentWithMethodMetadata,
        "guard",
        "methodWithGuard"
      );
    });

    it("should call insertInjectable for each class-level injectable", () => {
      const getAllMethodNamesSpy = spyOn(untypedScanner.metadataScanner, "getAllMethodNames").mockImplementation(() => []);
      // @ts-expect-error Mismatch types
      const reflectMetadataSpy = spyOn(scanner, "reflectMetadata").mockImplementation(() => [TestInjectable]);
      // @ts-expect-error Mismatch types
      const insertInjectableSpy = spyOn(scanner, "insertInjectable").mockImplementation(() => {});
      spies.push(getAllMethodNamesSpy, reflectMetadataSpy, insertInjectableSpy);

      scanner.reflectInjectables(ComponentWithMethodMetadata, "token", GUARDS_METADATA);

      expect(insertInjectableSpy).toHaveBeenCalledWith(
        TestInjectable,
        "token", 
        ComponentWithMethodMetadata,
        "guard"
      );
    });
  });

  describe("reflectParamInjectables", () => {
    class TestPipe {}
    
    @Injectable()
    class ComponentWithParamMetadata {
      // @ts-expect-error Mismatch types
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      public methodWithParams(@UseGuards(TestPipe) param: any) {}
      public methodWithoutParams() {}
    }

    it("should handle param injectables when metadata exists", () => {
      const getAllMethodNamesSpy = spyOn(untypedScanner.metadataScanner, "getAllMethodNames").mockImplementation(() => ["methodWithParams", "methodWithoutParams"]);
      const getMetadataSpy = spyOn(Reflect, "getMetadata")
        .mockImplementationOnce(() => ({
          0: {
            index: 0,
            data: "test",
            pipes: [TestPipe],
          },
        }))
        .mockImplementationOnce(() => undefined);
      // @ts-expect-error Mismatch types
      const insertInjectableSpy = spyOn(scanner, "insertInjectable").mockImplementation(() => {});
      spies.push(getAllMethodNamesSpy, getMetadataSpy, insertInjectableSpy);

      scanner.reflectParamInjectables(ComponentWithParamMetadata, "token", ROUTE_ARGS_METADATA);

      expect(insertInjectableSpy).toHaveBeenCalledWith(
        TestPipe,
        "token",
        ComponentWithParamMetadata,
        "pipe",
        "methodWithParams"
      );
    });

    it("should handle flat pipes in param metadata", () => {
      const getAllMethodNamesSpy = spyOn(untypedScanner.metadataScanner, "getAllMethodNames").mockImplementation(() => ["methodWithParams"]);
      const getMetadataSpy = spyOn(Reflect, "getMetadata").mockImplementation(() => ({
        0: {
          index: 0,
          data: "test",
          pipes: [[TestPipe], [TestPipe]],
        },
      }));
      // @ts-expect-error Mismatch types
      const insertInjectableSpy = spyOn(scanner, "insertInjectable").mockImplementation(() => {});
      spies.push(getAllMethodNamesSpy, getMetadataSpy, insertInjectableSpy);

      scanner.reflectParamInjectables(ComponentWithParamMetadata, "token", ROUTE_ARGS_METADATA);

      expect(insertInjectableSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("addScopedEnhancersMetadata", () => {
    it("should add scoped enhancers metadata to entry providers", () => {
      const mockInstanceWrapper = new InstanceWrapper();
      const mockEntryProvider = {
        addEnhancerMetadata: mock(() => {}),
      };
      const mockModule = {
        injectables: new Map([["providerKey", mockInstanceWrapper]]),
        entryProviders: [mockEntryProvider],
      };
      const mockModulesContainer = new Map([["moduleKey", mockModule]]);

      untypedScanner.applicationProvidersApplyMap = [
        {
          moduleKey: "moduleKey",
          providerKey: "providerKey",
          type: APP_GUARD,
          scope: Scope.REQUEST,
        },
      ];

      // @ts-expect-error Mismatch types
      const getModulesSpy = spyOn(container, "getModules").mockImplementation(() => mockModulesContainer);
      const isRequestOrTransientSpy = spyOn(untypedScanner, "isRequestOrTransient").mockImplementation(() => true);
      spies.push(getModulesSpy, isRequestOrTransientSpy);

      scanner.addScopedEnhancersMetadata();

      expect(mockEntryProvider.addEnhancerMetadata).toHaveBeenCalledWith(mockInstanceWrapper);
    });

    it("should filter out non-request/transient scoped providers", () => {
      untypedScanner.applicationProvidersApplyMap = [
        {
          moduleKey: "moduleKey",
          providerKey: "providerKey", 
          type: APP_GUARD,
          scope: Scope.DEFAULT,
        },
      ];

      // @ts-expect-error Mismatch types
      const getModulesSpy = spyOn(container, "getModules").mockImplementation(() => new Map());
      const isRequestOrTransientSpy = spyOn(untypedScanner, "isRequestOrTransient").mockImplementation(() => false);
      spies.push(getModulesSpy, isRequestOrTransientSpy);

      scanner.addScopedEnhancersMetadata();

      expect(getModulesSpy).not.toHaveBeenCalled();
    });
  });

  describe("isDynamicModule", () => {
    it("should return true for dynamic modules", () => {
      const dynamicModule = { module: TestComponent, providers: [] };
      expect(scanner.isDynamicModule(dynamicModule)).toBe(true);
    });

    it("should return false for regular modules", () => {
      expect(scanner.isDynamicModule(TestComponent)).toBe(false);
    });

    it("should return false for null/undefined", () => {
      // @ts-expect-error Mismatch types
      expect(scanner.isDynamicModule(null)).toBeFalsy();
      // @ts-expect-error Mismatch types
      expect(scanner.isDynamicModule(undefined)).toBeFalsy();
    });
  });

  describe("isCustomProvider", () => {
    it("should return true for providers with provide property", () => {
      const customProvider = { provide: "TOKEN", useValue: "test" };
      expect(scanner.isCustomProvider(customProvider)).toBe(true);
    });

    it("should return false for class providers without provide property", () => {
      expect(scanner.isCustomProvider(TestComponent)).toBe(false);
    });

    it("should return false for null/undefined providers", () => {
      // @ts-expect-error Mismatch types
      expect(scanner.isCustomProvider(null)).toBeFalsy();
      // @ts-expect-error Mismatch types
      expect(scanner.isCustomProvider(undefined)).toBeFalsy();
    });
  });

  describe("calculateModulesDistance", () => {
    it("should skip when no root module exists", () => {
      const mockModulesIterator = {
        next: mock()
          .mockImplementationOnce(() => ({ value: "InternalCoreModule", done: false }))
          .mockImplementationOnce(() => ({ value: undefined, done: true })),
      };
      const getModulesSpy = spyOn(container, "getModules").mockImplementation(() => ({
        values: () => mockModulesIterator,
      } as any));
      spies.push(getModulesSpy);

      scanner.calculateModulesDistance();

      expect(mockModulesIterator.next).toHaveBeenCalledTimes(2);
    });

    it("should calculate distance for modules", () => {
      const mockRootModule = { isGlobal: false };
      const mockModulesIterator = {
        next: mock()
          .mockImplementationOnce(() => ({ value: "InternalCoreModule", done: false }))
          .mockImplementationOnce(() => ({ value: mockRootModule, done: false })),
      };
      const getModulesSpy = spyOn(container, "getModules").mockImplementation(() => ({
        values: () => mockModulesIterator,
      } as any));
      
      const walkSpy = mock((callback: any) => {
        callback(mockRootModule, 1);
      });
      const TopologyTreeSpy = spyOn(TopologyTree.prototype, "walk").mockImplementation(walkSpy);
      spies.push(getModulesSpy, TopologyTreeSpy);

      scanner.calculateModulesDistance();

      expect(mockRootModule).toHaveProperty("distance", 1);
    });
  });
});