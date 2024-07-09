// import chai from "chai";
// import { expect } from "chai";
// import chaiAsPromised from "chai-as-promised";
// import sinon from "sinon";
// import { MiddlewareModule } from "../../middleware/module";
// import { GraphInspector } from "@venok/core/inspector/graph-inspector";
// import { Controller, RequestMapping } from "../../decorators";
// import { RequestMethod } from "../../enums";
// import { ApplicationConfig, Injectable, VenokContainer } from "@venok/core";
// import { RouterExceptionFiltersContext } from "../../filters/context";
// import { HttpConfig } from "../../application/config";
// import { NoopHttpAdapter } from "../../helpers";
// import { RouteInfoPathExtractor } from "../../middleware/extractor";
// import { Module } from "@venok/core/injector/module/module";
// import { VenokMiddleware } from "../../interfaces";
// import { MiddlewareContainer } from "../../middleware/container";
// import { MiddlewareBuilder } from "../../middleware";
// import { RuntimeException } from "@venok/core/errors/exceptions";
// import { InvalidMiddlewareException } from "../../errors/invalid-middleware.exception";
// import { InstanceWrapper } from "@venok/core/injector/instance/wrapper";
//
// chai.use(chaiAsPromised);
//
// describe("MiddlewareModule", () => {
//   let middlewareModule: MiddlewareModule;
//   let graphInspector: GraphInspector;
//
//   @Controller("test")
//   class BasicController {}
//
//   @Controller("test")
//   class BaseController {
//     @RequestMapping({ path: "test" })
//     public getTest() {}
//
//     @RequestMapping({ path: "another", method: RequestMethod.DELETE })
//     public getAnother() {}
//   }
//
//   @Injectable()
//   class TestMiddleware implements VenokMiddleware {
//     public use(req: any, res: any, next: () => void) {}
//   }
//
//   beforeEach(() => {
//     const container = new VenokContainer();
//     const appConfig = new ApplicationConfig();
//     const httpConfig = new HttpConfig();
//     graphInspector = new GraphInspector(container);
//     middlewareModule = new MiddlewareModule();
//     middlewareModule["routerExceptionFilter"] = new RouterExceptionFiltersContext(
//       new VenokContainer(),
//       appConfig,
//       new NoopHttpAdapter({}),
//     );
//     middlewareModule["routeInfoPathExtractor"] = new RouteInfoPathExtractor(httpConfig);
//     middlewareModule["routerExceptionFilter"] = new RouterExceptionFiltersContext(
//       container,
//       appConfig,
//       new NoopHttpAdapter({}),
//     );
//     middlewareModule["graphInspector"] = graphInspector;
//   });
//
//   describe("loadConfiguration", () => {
//     it('should call "configure" method if method is implemented', async () => {
//       const stubContainer = new VenokContainer();
//       stubContainer.getModules().set("Test", new Module(class {}, stubContainer));
//
//       const configureSpy = sinon.spy();
//       const mockModule = {
//         instance: {
//           configure: configureSpy,
//         },
//       };
//
//       (middlewareModule as any).container = stubContainer;
//       await middlewareModule.loadConfiguration(new MiddlewareContainer(stubContainer), mockModule as any, "Test");
//
//       expect(configureSpy.calledOnce).to.be.true;
//       expect(
//         configureSpy.calledWith(
//           new MiddlewareBuilder(
//             (middlewareModule as any).routesMapper,
//             undefined as any,
//             new RouteInfoPathExtractor(new HttpConfig()),
//           ),
//         ),
//       ).to.be.true;
//     });
//   });
//
//   describe("registerRouteMiddleware", () => {
//     class TestModule {}
//
//     let nestContainer: VenokContainer;
//
//     beforeEach(() => {
//       nestContainer = new VenokContainer();
//       nestContainer.getModules().set("Test", new Module(TestModule, nestContainer));
//     });
//     it('should throw "RuntimeException" exception when middleware is not stored in container', () => {
//       const route = { path: "Test" };
//       const configuration = {
//         middleware: [TestMiddleware],
//         forRoutes: [BaseController],
//       };
//       const useSpy = sinon.spy();
//       const app = { use: useSpy };
//
//       middlewareModule["container"] = nestContainer;
//
//       expect(
//         middlewareModule.registerRouteMiddleware(
//           new MiddlewareContainer(nestContainer),
//           route as any,
//           configuration,
//           "Test",
//           app,
//         ),
//       ).to.eventually.be.rejectedWith(RuntimeException);
//     });
//
//     it('should throw "InvalidMiddlewareException" exception when middleware does not have "use" method', () => {
//       @Injectable()
//       class InvalidMiddleware {}
//
//       const route = { path: "Test" };
//       const configuration = {
//         middleware: [InvalidMiddleware],
//         forRoutes: [BaseController],
//       };
//
//       const useSpy = sinon.spy();
//       const app = { use: useSpy };
//
//       const container = new MiddlewareContainer(nestContainer);
//       const moduleKey = "Test";
//       container.insertConfig([configuration], moduleKey);
//
//       const instance = new InvalidMiddleware();
//       container.getMiddlewareCollection(moduleKey).set("InvalidMiddleware", {
//         metatype: InvalidMiddleware,
//         instance,
//       } as any);
//
//       expect(
//         middlewareModule.registerRouteMiddleware(container, route as any, configuration, moduleKey, app),
//       ).to.be.rejectedWith(InvalidMiddlewareException);
//     });
//
//     it("should mount middleware when is stored in container", async () => {
//       const route = "testPath";
//       const configuration = {
//         middleware: [TestMiddleware],
//         forRoutes: ["test", BasicController, BaseController],
//       };
//
//       const createMiddlewareFactoryStub = sinon.stub().callsFake(() => () => null);
//       const app = {
//         createMiddlewareFactory: createMiddlewareFactoryStub,
//       };
//
//       const stubContainer = new VenokContainer();
//       stubContainer.getModules().set("Test", new Module(TestModule, stubContainer));
//
//       const container = new MiddlewareContainer(stubContainer);
//       const moduleKey = "Test";
//       container.insertConfig([configuration], moduleKey);
//
//       const instance = new TestMiddleware();
//       container.getMiddlewareCollection(moduleKey).set(
//         TestMiddleware,
//         new InstanceWrapper({
//           metatype: TestMiddleware,
//           instance,
//         }),
//       );
//       sinon.stub(stubContainer, "getModuleByKey").callsFake(() => new Module(class {}, stubContainer));
//       middlewareModule["container"] = stubContainer;
//
//       await middlewareModule.registerRouteMiddleware(
//         container,
//         { path: route, method: RequestMethod.ALL },
//         configuration,
//         moduleKey,
//         app,
//       );
//       expect(createMiddlewareFactoryStub.calledOnce).to.be.true;
//     });
//
//     it("should insert the expected middleware definition", async () => {
//       const route = "testPath";
//       const configuration = {
//         middleware: [TestMiddleware],
//         forRoutes: ["test", BasicController, BaseController],
//       };
//       const instance = new TestMiddleware();
//       const instanceWrapper = new InstanceWrapper({
//         metatype: TestMiddleware,
//         instance,
//         name: TestMiddleware.name,
//       });
//       const createMiddlewareFactoryStub = sinon.stub().callsFake(() => () => null);
//       const app = {
//         createMiddlewareFactory: createMiddlewareFactoryStub,
//       };
//
//       const stubContainer = new VenokContainer();
//       stubContainer.getModules().set("Test", new Module(TestModule, stubContainer));
//       const container = new MiddlewareContainer(stubContainer);
//       const moduleKey = "Test";
//       container.insertConfig([configuration], moduleKey);
//       container.getMiddlewareCollection(moduleKey).set(TestMiddleware, instanceWrapper);
//       sinon.stub(stubContainer, "getModuleByKey").callsFake(() => new Module(class {}, stubContainer));
//       middlewareModule["container"] = stubContainer;
//
//       const insertEntrypointDefinitionSpy = sinon.spy(graphInspector, "insertEntrypointDefinition");
//
//       await middlewareModule.registerRouteMiddleware(
//         container,
//         { path: route, method: RequestMethod.ALL },
//         configuration,
//         moduleKey,
//         app,
//       );
//
//       expect(createMiddlewareFactoryStub.calledOnce).to.be.true;
//       expect(
//         insertEntrypointDefinitionSpy.calledWith({
//           type: "middleware",
//           methodName: "use",
//           className: instanceWrapper.name,
//           classNodeId: instanceWrapper.id,
//           metadata: {
//             key: route,
//             path: route,
//             requestMethod: "ALL",
//             version: undefined,
//           } as any,
//         }),
//       ).to.be.true;
//     });
//   });
// });
