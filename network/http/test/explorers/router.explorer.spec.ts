// import { expect } from "chai";
// import sinon from "sinon";
//
// import { All, Controller, Get, Post } from "../../decorators";
// import { RouterExplorer } from "../../explorers/router.explorer";
// import { Injector } from "@venok/core/injector/injector";
// import { RouterExceptionFiltersContext } from "../../filters/context";
// import { ApplicationConfig, MetadataScanner, VenokContainer } from "@venok/core";
// import { RoutePathFactory } from "../../factory";
// import { GraphInspector } from "@venok/core/inspector/graph-inspector";
// import { HttpConfig } from "../../application/config";
// import { RequestMethod, VersioningType } from "../../enums";
// import { RoutePathMetadata, VersioningOptions, VersionValue } from "../../interfaces";
// import { InstanceWrapper } from "@venok/core/injector/instance/wrapper";
// import { ExecutionContextHost } from "@venok/core/context/execution-host";
// import { NoopHttpAdapter } from "../../helpers";
//
// describe("RouterExplorer", () => {
//   @Controller("global")
//   class TestRoute {
//     @Get("test")
//     public getTest() {}
//
//     @Post("test")
//     public postTest() {}
//
//     @All("another-test")
//     public anotherTest() {}
//
//     @Get(["foo", "bar"])
//     public getTestUsingArray() {}
//   }
//
//   @Controller(["global", "global-alias"])
//   class TestRouteAlias {
//     @Get("test")
//     public getTest() {}
//
//     @Post("test")
//     public postTest() {}
//
//     @All("another-test")
//     public anotherTest() {}
//
//     @Get(["foo", "bar"])
//     public getTestUsingArray() {}
//   }
//
//   class ClassWithMissingControllerDecorator {}
//
//   let routerBuilder: RouterExplorer;
//   let injector: Injector;
//   let exceptionsFilter: RouterExceptionFiltersContext;
//   let applicationConfig: ApplicationConfig;
//   let httpConfig: HttpConfig;
//   let routePathFactory: RoutePathFactory;
//   let graphInspector: GraphInspector;
//
//   beforeEach(() => {
//     const container = new VenokContainer();
//
//     httpConfig = new HttpConfig();
//     applicationConfig = new ApplicationConfig();
//     injector = new Injector();
//     routePathFactory = new RoutePathFactory(httpConfig);
//     graphInspector = new GraphInspector(container);
//     exceptionsFilter = new RouterExceptionFiltersContext(container, applicationConfig, null as any);
//     routerBuilder = new RouterExplorer(
//       new MetadataScanner(),
//       container,
//       injector,
//       null as any,
//       exceptionsFilter,
//       applicationConfig,
//       routePathFactory,
//       graphInspector,
//       httpConfig.getHttpAdapterRef(),
//     );
//   });
//
//   describe("applyPathsToRouterProxy", () => {
//     it("should method return expected object which represent single route", () => {
//       const bindStub = sinon.stub(routerBuilder, "applyCallbackToRouter" as any);
//       const paths = [
//         { path: [""], requestMethod: RequestMethod.GET },
//         { path: ["test"], requestMethod: RequestMethod.GET },
//         { path: ["foo", "bar"], requestMethod: RequestMethod.GET },
//       ];
//
//       routerBuilder.applyPathsToRouterProxy(null as any, paths as any, null as any, "", {}, "");
//
//       expect(bindStub.calledWith(null, paths[0], null)).to.be.true;
//       expect(bindStub.callCount).to.be.eql(paths.length);
//     });
//
//     it("should method return expected object which represents a single versioned route", () => {
//       const bindStub = sinon.stub(routerBuilder, "applyCallbackToRouter" as any);
//       const paths = [
//         { path: [""], requestMethod: RequestMethod.GET },
//         { path: ["test"], requestMethod: RequestMethod.GET },
//         { path: ["foo", "bar"], requestMethod: RequestMethod.GET },
//       ];
//
//       const routePathMetadata: RoutePathMetadata = {
//         versioningOptions: { type: VersioningType.URI },
//       };
//       routerBuilder.applyPathsToRouterProxy(null as any, paths as any, null as any, "", routePathMetadata, "1");
//
//       expect(bindStub.calledWith(null, paths[0], null, "", routePathMetadata, "1")).to.be.true;
//       expect(bindStub.callCount).to.be.eql(paths.length);
//     });
//   });
//
//   describe("extractRouterPath", () => {
//     it("should return expected path", () => {
//       expect(routerBuilder.extractRouterPath(TestRoute)).to.be.eql(["/global"]);
//     });
//
//     it("should return expected path with alias", () => {
//       expect(routerBuilder.extractRouterPath(TestRouteAlias)).to.be.eql(["/global", "/global-alias"]);
//     });
//
//     it("should return [] when missing the `@Controller()` decorator in the class, displaying class's name", () => {
//       expect(routerBuilder.extractRouterPath(ClassWithMissingControllerDecorator)).to.be.eql([]);
//     });
//   });
//
//   describe("createRequestScopedHandler", () => {
//     let nextSpy: sinon.SinonSpy;
//
//     beforeEach(() => {
//       sinon.stub(injector, "loadPerContext").callsFake(() => {
//         throw new Error();
//       });
//       nextSpy = sinon.spy();
//       sinon.stub(exceptionsFilter, "create").callsFake(
//         () =>
//           ({
//             next: nextSpy,
//           }) as any,
//       );
//     });
//
//     describe('when "loadPerContext" throws', () => {
//       const moduleKey = "moduleKey";
//       const methodKey = "methodKey";
//       const module = {
//         controllers: new Map(),
//       } as any;
//       const wrapper = new InstanceWrapper({
//         instance: { [methodKey]: {} },
//       });
//
//       it("should delegate error to exception filters", async () => {
//         const handler = routerBuilder.createRequestScopedHandler(
//           wrapper,
//           RequestMethod.ALL,
//           module,
//           moduleKey,
//           methodKey,
//         );
//         await handler(null as any, null, null as any);
//
//         expect(nextSpy.called).to.be.true;
//         expect(nextSpy.getCall(0).args[0]).to.be.instanceOf(Error);
//         expect(nextSpy.getCall(0).args[1]).to.be.instanceOf(ExecutionContextHost);
//       });
//     });
//   });
//
//   describe("applyVersionFilter", () => {
//     it("should call and return the `applyVersionFilter` from the underlying http server", () => {
//       const router = sinon.spy(new NoopHttpAdapter({}));
//       const routePathMetadata: RoutePathMetadata = {
//         methodVersion: sinon.fake() as unknown as RoutePathMetadata["methodVersion"],
//         versioningOptions: sinon.fake() as unknown as RoutePathMetadata["versioningOptions"],
//       };
//       const handler = sinon.stub();
//
//       // We're using type assertion here because `applyVersionFilter` is private
//       const versionFilter = (routerBuilder as any).applyVersionFilter(router, routePathMetadata, handler);
//
//       expect(
//         router.applyVersionFilter.calledOnceWithExactly(
//           handler,
//           routePathMetadata.methodVersion as VersionValue,
//           routePathMetadata.versioningOptions as VersioningOptions,
//         ),
//       ).to.be.true;
//
//       expect(router.applyVersionFilter.returnValues[0]).to.be.equal(versionFilter);
//     });
//   });
//
//   describe("copyMetadataToCallback", () => {
//     it("should then copy the metadata from the original callback to the target callback", () => {
//       const originalCallback = () => {};
//       Reflect.defineMetadata("test_metadata_key", "test_metadata_value", originalCallback);
//
//       const targetCallback = () => {};
//
//       // We're using type assertion here because `copyMetadataToCallback` is private
//       (routerBuilder as any).copyMetadataToCallback(originalCallback, targetCallback);
//
//       expect(Reflect.getMetadata("test_metadata_key", targetCallback)).to.be.equal("test_metadata_value");
//     });
//   });
// });
