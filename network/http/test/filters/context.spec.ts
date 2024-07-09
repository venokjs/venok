import { expect } from "chai";
import sinon from "sinon";
import { ApplicationConfig, Catch, Module, VenokContainer, VenokFactory } from "@venok/core";
import { RouterExceptionFiltersContext } from "../../filters/context";
import { InstanceWrapper } from "@venok/core/injector/instance/wrapper";
import { HttpConfig } from "@venok/http/application/config";
import { HTTP_APP_OPTIONS } from "@venok/http/application/http.module-defenition";
import { NoopHttpAdapter } from "@venok/http/helpers";

describe("RouterExceptionFiltersContext", () => {
  let applicationConfig: ApplicationConfig;
  let exceptionFilter: RouterExceptionFiltersContext;
  let container: VenokContainer;

  class CustomException {}

  @Catch(CustomException)
  class ExceptionFilter {
    public catch(exc: any, res: any) {}
  }

  beforeEach(async () => {
    @Module({
      providers: [
        {
          useValue: {
            port: 9999,
            adapter: new NoopHttpAdapter({}),
            callback: () => {},
          },
          provide: HTTP_APP_OPTIONS,
        },
        HttpConfig,
      ],
    })
    class TestModule {}

    const { container } = await VenokFactory.createApplicationContext(TestModule);
    exceptionFilter = new RouterExceptionFiltersContext(container, container.applicationConfig);
    applicationConfig = container.applicationConfig;
  });
  describe("create", () => {
    describe("when filters metadata is empty", () => {
      class EmptyMetadata {}
      beforeEach(() => {
        sinon.stub(exceptionFilter, "createContext").returns([]);
      });
      it("should return plain ExceptionHandler object", () => {
        const filter = exceptionFilter.create(new EmptyMetadata(), () => ({}) as any, undefined as any);
        expect((filter as any).filters).to.be.empty;
      });
    });
    // describe("when filters metadata is not empty", () => {
    //   @UseFilters(new HttpExceptionFilter(container))
    //   class WithMetadata {}
    //
    //   it("should return ExceptionHandler object with exception filters", () => {
    //     const filter = exceptionFilter.create(new WithMetadata(), () => ({}) as any, undefined as any);
    //     expect((filter as any).filters).to.not.be.empty;
    //   });
    // });
  });
  describe("reflectCatchExceptions", () => {
    it("should return FILTER_CATCH_EXCEPTIONS metadata", () => {
      expect(exceptionFilter.reflectCatchExceptions(new ExceptionFilter())).to.be.eql([CustomException]);
    });
  });
  describe("createConcreteContext", () => {
    class InvalidFilter {}

    const filters = [new ExceptionFilter(), new InvalidFilter(), "test"];

    it("should return expected exception filters metadata", () => {
      const resolved = exceptionFilter.createConcreteContext(filters as any);
      expect(resolved).to.have.length(1);
      expect(resolved[0].exceptionMetatypes).to.be.deep.equal([CustomException]);
      expect(resolved[0].func).to.be.a("function");
    });
  });
  describe("getGlobalMetadata", () => {
    describe("when contextId is static and inquirerId is nil", () => {
      it("should return global filters", () => {
        const expectedResult = applicationConfig.getGlobalFilters();
        expect(exceptionFilter.getGlobalMetadata()).to.be.equal(expectedResult);
      });
    });
    describe("otherwise", () => {
      it("should merge static global with request/transient scoped filters", () => {
        const globalFilters: any = ["test"];
        const instanceWrapper = new InstanceWrapper();
        const instance = "request-scoped";
        const scopedFilterWrappers = [instanceWrapper];

        sinon.stub(applicationConfig, "getGlobalFilters").callsFake(() => globalFilters);
        sinon.stub(applicationConfig, "getGlobalRequestFilters").callsFake(() => scopedFilterWrappers);
        sinon.stub(instanceWrapper, "getInstanceByContextId").callsFake(() => ({ instance }) as any);

        expect(exceptionFilter.getGlobalMetadata({ id: 3 })).to.contains(instance, ...globalFilters);
      });
    });
  });
});
