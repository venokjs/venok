// import { expect } from "chai";
// import sinon from "sinon";
// import { Controller } from "../../decorators/controller.decorator";
// import { Get, Post } from "../../decorators";
// import { ApplicationConfig, Injectable, Module, VenokContainer } from "@venok/core";
// import { RoutesResolver } from "../../router/resolver";
// import { SerializedGraph } from "@venok/core/inspector/serialized-graph";
// import { Injector } from "@venok/core/injector/injector";
// import { GraphInspector } from "@venok/core/inspector/graph-inspector";
// import { InstanceWrapper } from "@venok/core/injector/instance/wrapper";
// import { NoopHttpAdapter } from "../../helpers/adapter.helper";
// import { VersioningType } from "../../enums";
// import { MODULE_PATH } from "@venok/core/constants";
// import { BadRequestException } from "../../errors";
// import { HttpConfig } from "../../application/config";
//
// describe("RoutesResolver", () => {
//   @Controller("global")
//   class TestRoute {
//     @Get("test")
//     public getTest() {}
//
//     @Post("another-test")
//     public anotherTest() {}
//   }
//
//   @Injectable()
//   class TestProvider {
//     public getTest() {}
//   }
//
//   @Controller({ host: "api.example.com" })
//   class TestHostRoute {
//     @Get()
//     public getTest() {}
//   }
//
//   @Controller({ version: "1" })
//   class TestVersionRoute {
//     @Get()
//     public getTest() {}
//   }
//
//   @Module({
//     providers: [TestRoute, TestProvider],
//   })
//   class TestModule {}
//
//   @Module({
//     providers: [TestRoute],
//   })
//   class TestModule2 {}
//
//   let router: any;
//   let routesResolver: RoutesResolver;
//   let container: VenokContainer;
//   let modules: Map<string, any>;
//   let applicationRef: any;
//   let httpConfig2: HttpConfig;
//
//   beforeEach(() => {
//     modules = new Map();
//     applicationRef = {
//       use: () => ({}),
//       setNotFoundHandler: sinon.spy(),
//       setErrorHandler: sinon.spy(),
//     } as any;
//     container = {
//       getModules: () => modules,
//       getModuleByKey: (key: string) => modules.get(key),
//       getHttpAdapterRef: () => applicationRef,
//       serializedGraph: new SerializedGraph(),
//     } as any;
//     httpConfig2 = {
//       getHttpAdapterRef: () => applicationRef,
//       getGlobalPrefixOptions: () => [],
//       getGlobalPrefix: () => "",
//     } as any;
//     router = {
//       get() {},
//       post() {},
//     };
//   });
//
//   beforeEach(() => {
//     routesResolver = new RoutesResolver(
//       container,
//       new ApplicationConfig(),
//       new HttpConfig(),
//       new Injector(),
//       new GraphInspector(container),
//     );
//   });
//
//   describe("registerRouters", () => {
//     it("should register controllers to router instance", () => {
//       const routes = new Map();
//       const routeWrapper = new InstanceWrapper({
//         instance: new TestRoute(),
//         metatype: TestRoute,
//       });
//       routes.set("TestRoute", routeWrapper);
//
//       const appInstance = new NoopHttpAdapter(router);
//       const exploreSpy = sinon.spy((routesResolver as any).routerExplorer, "explore");
//       const moduleName = "";
//       modules.set(moduleName, {});
//
//       sinon.stub((routesResolver as any).routerExplorer, "extractRouterPath").callsFake(() => [""]);
//       routesResolver.registerRouters(routes, moduleName, "", "", appInstance);
//
//       const routePathMetadata = {
//         ctrlPath: "",
//         modulePath: "",
//         globalPrefix: "",
//         controllerVersion: undefined,
//         versioningOptions: undefined,
//         methodVersion: undefined,
//         methodPath: "/another-test",
//       };
//       expect(exploreSpy.called).to.be.true;
//       expect(exploreSpy.calledWith(routeWrapper, moduleName, appInstance, undefined, routePathMetadata)).to.be.true;
//     });
//
//     // it("should not register provider to router instance", () => {
//     //   const routes = new Map();
//     //   const routeWrapper = new InstanceWrapper({
//     //     instance: new TestProvider(),
//     //     metatype: TestProvider,
//     //   });
//     //   routes.set("TestProvider", TestProvider);
//     //
//     //   const appInstance = new NoopHttpAdapter(router);
//     //   const exploreSpy = sinon.spy((routesResolver as any).routerExplorer, "explore");
//     //   const moduleName = "";
//     //   modules.set(moduleName, {});
//     //
//     //   sinon.stub((routesResolver as any).routerExplorer, "extractRouterPath").callsFake(() => [""]);
//     //   routesResolver.registerRouters(routes, moduleName, "", "", appInstance);
//     //
//     //   // const routePathMetadata = {
//     //   //   ctrlPath: "",
//     //   //   modulePath: "",
//     //   //   globalPrefix: "",
//     //   //   controllerVersion: undefined,
//     //   //   versioningOptions: undefined,
//     //   //   methodVersion: undefined,
//     //   //   methodPath: "/another-test",
//     //   // };
//     //   // expect(exploreSpy.called).to.be.true;
//     //   // expect(exploreSpy.calledWith(routeWrapper, moduleName, appInstance, undefined, routePathMetadata)).to.be.true;
//     // });
//
//     it("should register with host when specified", () => {
//       const routes = new Map();
//       const routeWrapper = new InstanceWrapper({
//         instance: new TestHostRoute(),
//         metatype: TestHostRoute,
//       });
//       routes.set("TestHostRoute", routeWrapper);
//
//       const appInstance = new NoopHttpAdapter(router);
//       const exploreSpy = sinon.spy((routesResolver as any).routerExplorer, "explore");
//       const moduleName = "";
//       modules.set(moduleName, {});
//
//       sinon.stub((routesResolver as any).routerExplorer, "extractRouterPath").callsFake(() => [""]);
//       routesResolver.registerRouters(routes, moduleName, "", "", appInstance);
//
//       const routePathMetadata = {
//         ctrlPath: "",
//         modulePath: "",
//         globalPrefix: "",
//         controllerVersion: undefined,
//         versioningOptions: undefined,
//         methodVersion: undefined,
//         methodPath: "/",
//       };
//
//       expect(exploreSpy.called).to.be.true;
//       expect(exploreSpy.calledWith(routeWrapper, moduleName, appInstance, "api.example.com", routePathMetadata)).to.be
//         .true;
//     });
//
//     it("should register with version when specified", () => {
//       const applicationConfig = new ApplicationConfig();
//       const httpConfig = new HttpConfig();
//       httpConfig.enableVersioning({
//         type: VersioningType.URI,
//       });
//       routesResolver = new RoutesResolver(
//         container,
//         applicationConfig,
//         httpConfig,
//         new Injector(),
//         new GraphInspector(container),
//       );
//
//       const routes = new Map();
//       const routeWrapper = new InstanceWrapper({
//         instance: new TestVersionRoute(),
//         metatype: TestVersionRoute,
//       });
//       routes.set("TestVersionRoute", routeWrapper);
//
//       const appInstance = new NoopHttpAdapter(router);
//       const exploreSpy = sinon.spy((routesResolver as any).routerExplorer, "explore");
//       const moduleName = "";
//       modules.set(moduleName, {});
//
//       sinon.stub((routesResolver as any).routerExplorer, "extractRouterPath").callsFake(() => [""]);
//       routesResolver.registerRouters(routes, moduleName, "", "", appInstance);
//
//       const routePathMetadata = {
//         ctrlPath: "",
//         modulePath: "",
//         globalPrefix: "",
//         controllerVersion: "1",
//         versioningOptions: {
//           type: VersioningType.URI,
//         },
//         methodVersion: undefined,
//         methodPath: "/",
//       };
//
//       expect(exploreSpy.called).to.be.true;
//       expect(exploreSpy.calledWith(routeWrapper, moduleName, appInstance, undefined, routePathMetadata)).to.be.true;
//     });
//   });
//
//   describe("resolve", () => {
//     it('should call "registerRouters" for each module', () => {
//       const routes = new Map();
//       routes.set(
//         "TestRoute",
//         new InstanceWrapper({
//           instance: new TestRoute(),
//           metatype: TestRoute,
//         }),
//       );
//       modules.set("TestModule", { routes, metatype: class {} });
//       modules.set("TestModule2", { routes, metatype: class {} });
//
//       const registerRoutersStub = sinon.stub(routesResolver, "registerRouters").callsFake(() => undefined);
//
//       routesResolver.resolve({ use: sinon.spy() } as any, "basePath");
//       expect(registerRoutersStub.calledTwice).to.be.true;
//     });
//
//     describe("registerRouters", () => {
//       it("should register each module with the base path and append the module path if present ", () => {
//         const routes = new Map();
//         routes.set("TestRoute", {
//           instance: new TestRoute(),
//           metatype: TestRoute,
//         });
//
//         Reflect.defineMetadata(MODULE_PATH, "/test", TestModule);
//         modules.set("TestModule", { routes, metatype: TestModule });
//         modules.set("TestModule2", { routes, metatype: TestModule2 });
//
//         const spy = sinon.stub(routesResolver, "registerRouters").callsFake(() => undefined);
//
//         routesResolver.resolve(applicationRef, "api/v1");
//
//         expect(spy.getCall(0).calledWith(sinon.match.any, sinon.match.any, "api/v1", "/test")).to.be.true;
//         expect(spy.getCall(1).calledWith(sinon.match.any, sinon.match.any, "api/v1", sinon.match.any)).to.be.true;
//       });
//
//       it("should register each module with the module path if present", () => {
//         const routes = new Map();
//         routes.set("TestRoute", {
//           instance: new TestRoute(),
//           metatype: TestRoute,
//         });
//
//         Reflect.defineMetadata(MODULE_PATH, "/test", TestModule);
//         modules.set("TestModule", { routes, metatype: TestModule });
//         modules.set("TestModule2", { routes, metatype: TestModule2 });
//
//         const spy = sinon.stub(routesResolver, "registerRouters").callsFake(() => undefined);
//
//         routesResolver.resolve(applicationRef, "");
//
//         expect(spy.getCall(0).calledWith(sinon.match.any, sinon.match.any, "", "/test")).to.be.true;
//         // without module path
//         expect(spy.getCall(1).calledWith(sinon.match.any, sinon.match.any, "", undefined)).to.be.true;
//       });
//     });
//   });
//
//   describe("mapExternalExceptions", () => {
//     describe("when exception prototype is", () => {
//       describe("SyntaxError", () => {
//         it("should map to BadRequestException", () => {
//           const err = new SyntaxError();
//           const outputErr = routesResolver.mapExternalException(err);
//           expect(outputErr).to.be.instanceof(BadRequestException);
//         });
//       });
//       describe("URIError", () => {
//         it("should map to BadRequestException", () => {
//           const err = new URIError();
//           const outputErr = routesResolver.mapExternalException(err);
//           expect(outputErr).to.be.instanceof(BadRequestException);
//         });
//       });
//       describe("other", () => {
//         it("should behave as an identity", () => {
//           const err = new Error();
//           const outputErr = routesResolver.mapExternalException(err);
//           expect(outputErr).to.be.eql(err);
//         });
//       });
//     });
//   });
//
//   describe("registerNotFoundHandler", () => {
//     it("should register not found handler", () => {
//       routesResolver = new RoutesResolver(
//         container,
//         new ApplicationConfig(),
//         httpConfig2,
//         new Injector(),
//         new GraphInspector(container),
//       );
//
//       routesResolver.registerNotFoundHandler();
//
//       expect(applicationRef.setNotFoundHandler.called).to.be.true;
//     });
//   });
//
//   describe("registerExceptionHandler", () => {
//     it("should register exception handler", () => {
//       routesResolver = new RoutesResolver(
//         container,
//         new ApplicationConfig(),
//         httpConfig2,
//         new Injector(),
//         new GraphInspector(container),
//       );
//
//       routesResolver.registerExceptionHandler();
//
//       expect(applicationRef.setErrorHandler.called).to.be.true;
//     });
//   });
// });
