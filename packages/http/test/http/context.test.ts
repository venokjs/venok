import type { VenokParamsFactoryInterface } from "@venok/core";

import type { AbstractHttpAdapter } from "~/http/adapter.js";

import {
  ApplicationConfig,
  ApplicationContext,
  GuardsConsumer,
  GuardsContextCreator,
  InterceptorsConsumer,
  InterceptorsContextCreator,
  ModulesContainer,
  PipesConsumer,
  PipesContextCreator,
  STATIC_CONTEXT,
  VenokContainer,
  VenokContextCreator,
  VenokExceptionFilterContext
} from "@venok/core";
import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { of } from "rxjs";

import { HttpContextCreator } from "~/http/context.js";
import { HttpConfig } from "~/http/config.js";
import { HttpStatus } from "~/enums/status.enum.js";
import { HttpMethod } from "~/enums/method.enum.js";
import { HttpCode } from "~/decorators/http-code.decorator.js";
import { HEADERS_METADATA, METHOD_METADATA, REDIRECT_METADATA } from "~/constants.js";

describe("HttpContextCreator", () => {
  let contextCreator: HttpContextCreator;
  let mockAdapter: AbstractHttpAdapter;
  let mockContainer: VenokContainer;
  let mockApplicationConfig: ApplicationConfig;
  let mockHttpConfig: HttpConfig;
  let mockGuardsConsumer: GuardsConsumer;
  let mockPipesConsumer: PipesConsumer;
  let mockGuardsContextCreator: GuardsContextCreator;
  let mockInterceptorsContextCreator: InterceptorsContextCreator;
  let mockInterceptorsConsumer: InterceptorsConsumer;
  let mockModulesContainer: ModulesContainer;
  let mockPipesContextCreator: PipesContextCreator;
  let mockFiltersContextCreator: VenokExceptionFilterContext;

  beforeEach(() => {
    mockAdapter = {
      setResponseStatus: mock(),
      setResponseHeader: mock(),
      setResponseReply: mock(),
      setResponseRedirect: mock(),
      getStatusByMethod: mock(() => HttpStatus.OK),
    } as any;

    mockApplicationConfig = new ApplicationConfig();
    mockContainer = new VenokContainer(mockApplicationConfig);
    
    mockHttpConfig = {
      getHttpAdapterRef: mock(() => mockAdapter),
    } as any;

    mockGuardsConsumer = {
      tryActivate: mock(() => Promise.resolve(true)),
    } as any;

    mockPipesConsumer = {
      apply: mock((value) => Promise.resolve(value)),
    } as any;

    mockGuardsContextCreator = {
      create: mock(() => []),
    } as any;

    mockInterceptorsContextCreator = {} as any;
    mockInterceptorsConsumer = {} as any;
    mockModulesContainer = new ModulesContainer();

    mockPipesContextCreator = {
      setModuleContext: mock(),
      createConcreteContext: mock(() => []),
    } as any;

    mockFiltersContextCreator = {
      create: mock(() => ({ filters: [] })),
    } as any;

    contextCreator = new HttpContextCreator(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      mockGuardsContextCreator,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      mockGuardsConsumer,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      mockInterceptorsContextCreator,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      mockInterceptorsConsumer,
      mockModulesContainer,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      mockPipesContextCreator,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      mockPipesConsumer,
      mockFiltersContextCreator
    );

    // @ts-expect-error Mismatch types
    spyOn(contextCreator, "container").mockReturnValue(mockContainer);

    // Mock ApplicationContext and HttpConfig
    // @ts-expect-error Mismatch types
    spyOn(ApplicationContext.prototype, "get").mockReturnValue(mockHttpConfig);
  });

  describe("adapter getter", () => {
    it("should return cached adapter if already exists", () => {
      (contextCreator as any)._adapter = mockAdapter;
      
      const result = (contextCreator as any).adapter;
      
      expect(result).toBe(mockAdapter);
    });

    it("should create and cache adapter from HttpConfig", () => {
      const result = (contextCreator as any).adapter;
      
      expect(result).toBe(mockAdapter);
      expect(ApplicationContext.prototype.get).toHaveBeenCalledWith(HttpConfig);
      expect(mockHttpConfig.getHttpAdapterRef).toHaveBeenCalled();
    });
  });

  describe("create", () => {
    let instance: any;
    let callback: any;
    
    beforeEach(() => {
      instance = { 
        constructor: class TestController {},
      };
      callback = () => "result";
      
      // Mock parent create method
      spyOn(VenokContextCreator.prototype, "create").mockReturnValue(() => Promise.resolve("result"));
      // @ts-expect-error Mismatch types
      spyOn(VenokContextCreator.prototype, "getMetadata").mockReturnValue({
        getParamsMetadata: () => [],
      });
      spyOn(contextCreator, "getContextModuleKey").mockReturnValue("moduleKey");
      spyOn(contextCreator as any, "getExternalMetadata").mockReturnValue({
        fnHandleResponse: mock(),
        httpStatusCode: HttpStatus.OK,
        responseHeaders: [],
        hasCustomHeaders: false,
      });
      spyOn(contextCreator as any, "venokProxy").mockReturnValue({
        createProxy: mock((fn) => fn),
      });
    });

    it("should create context with default options", async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = contextCreator.create(instance as object, callback, "testMethod");
      
      expect(typeof result).toBe("function");
      expect(VenokContextCreator.prototype.create).toHaveBeenCalledWith(
        instance,
        callback,
        "testMethod",
        undefined,
        undefined,
        STATIC_CONTEXT,
        undefined,
        expect.objectContaining({
          interceptors: true,
          guards: true,
          filters: false,
          callback: expect.any(Function),
        }),
        "native"
      );
    });

    it("should create context with custom options", async () => {
      const customOptions = {
        interceptors: false,
        guards: false,
        filters: true,
        callback: mock(),
      };
      
      const result = contextCreator.create(
        instance as object,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        callback,
        "testMethod",
        "customKey",
        {} as VenokParamsFactoryInterface,
        // @ts-expect-error Mismatch types
        "customContextId",
        "customInquirer",
        customOptions,
        "http" as any
      );
      
      expect(typeof result).toBe("function");
    });

    it("should setup done callback correctly", async () => {
      const mockResponse = { data: "test" };
      const mockCtx = ["request", "response"];
      const fnHandleResponse = mock();
      
      // Clear previous mocks and setup new one
      (contextCreator as any).getExternalMetadata?.mockClear?.();
      spyOn(contextCreator as any, "getExternalMetadata").mockReturnValue({
        fnHandleResponse,
        httpStatusCode: HttpStatus.CREATED,
        responseHeaders: [{ name: "X-Test", value: "test" }],
        hasCustomHeaders: true,
      });
      
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      contextCreator.create(instance as object, callback, "testMethod");
      
      // Get the done callback that was passed to parent create
      const createCall = (VenokContextCreator.prototype.create as any).mock.calls.slice(-1)[0];
      const options = createCall[7];
      const doneCallback = options.callback;
      
      await doneCallback(mockResponse, mockCtx);
      
      expect(mockAdapter.setResponseStatus).toHaveBeenCalledWith(mockCtx, HttpStatus.CREATED);
      expect(mockAdapter.setResponseHeader).toHaveBeenCalledWith(mockCtx, "X-Test", "test");
      expect(fnHandleResponse).toHaveBeenCalledWith(mockResponse, mockCtx);
    });

    it("should setup done callback without custom headers", async () => {
      const mockResponse = { data: "test" };
      const mockCtx = ["request", "response"];
      const fnHandleResponse = mock();
      
      // Clear all mocks
      (VenokContextCreator.prototype.create as any).mockClear?.();
      (contextCreator as any).getExternalMetadata?.mockClear?.();
      (mockAdapter.setResponseStatus as any).mockClear?.();
      (mockAdapter.setResponseHeader as any).mockClear?.();
      
      spyOn(contextCreator as any, "getExternalMetadata").mockReturnValue({
        fnHandleResponse,
        httpStatusCode: HttpStatus.OK,
        responseHeaders: [],
        hasCustomHeaders: false,
      });
      
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      contextCreator.create(instance as object, callback, "testMethod");
      
      const createCall = (VenokContextCreator.prototype.create as any).mock.calls[0];
      const options = createCall[7];
      const doneCallback = options.callback;
      
      await doneCallback(mockResponse, mockCtx);
      
      expect(mockAdapter.setResponseStatus).toHaveBeenCalledWith(mockCtx, HttpStatus.OK);
      expect(mockAdapter.setResponseHeader).not.toHaveBeenCalled();
      expect(fnHandleResponse).toHaveBeenCalledWith(mockResponse, mockCtx);
    });

    it("should create exception filter and proxy", () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      contextCreator.create(instance as object, callback, "testMethod");
      
      expect(mockFiltersContextCreator.create).toHaveBeenCalledWith(
        instance,
        callback,
        "moduleKey",
        STATIC_CONTEXT,
        undefined
      );
    });
  });

  describe("getExternalMetadata", () => {
    let getParamsMetadata: any;
    let instance: any;
    let callback: any;
    
    beforeEach(() => {
      getParamsMetadata = mock(() => []);
      instance = { constructor: class TestController {} };
      callback = () => "result";
      
      spyOn(contextCreator, "isResponsePassthrough" as any).mockReturnValue(false);
      // @ts-expect-error Mismatch types
      spyOn(contextCreator, "reflectRedirect").mockReturnValue(undefined);
      spyOn(contextCreator, "reflectMethod").mockReturnValue(HttpMethod.GET);
      // @ts-expect-error Mismatch types
      spyOn(contextCreator, "reflectHttpStatusCode").mockReturnValue(undefined);
      spyOn(contextCreator, "reflectResponseHeaders").mockReturnValue([]);
      spyOn(contextCreator, "createHandleResponseFn").mockReturnValue(mock());
    });

    it("should return external metadata", () => {
      const result = (contextCreator as any).getExternalMetadata(
        getParamsMetadata,
        instance,
        callback,
        "testMethod",
        "moduleKey"
      );
      
      expect(result).toHaveProperty("fnHandleResponse");
      expect(result).toHaveProperty("httpStatusCode");
      expect(result).toHaveProperty("hasCustomHeaders");
      expect(result).toHaveProperty("responseHeaders");
    });

    it("should use custom HTTP code if provided", () => {
      spyOn(contextCreator, "reflectHttpStatusCode").mockReturnValue(HttpStatus.CREATED);
      
      const result = (contextCreator as any).getExternalMetadata(
        getParamsMetadata,
        instance,
        callback,
        "testMethod",
        "moduleKey"
      );
      
      expect(result.httpStatusCode).toBe(HttpStatus.CREATED);
    });

    it("should use adapter default status for method", () => {
      // @ts-expect-error Mismatch types
      spyOn(contextCreator, "reflectHttpStatusCode").mockReturnValue(undefined);
      spyOn(mockAdapter, "getStatusByMethod").mockReturnValue(HttpStatus.NO_CONTENT);
      
      const result = (contextCreator as any).getExternalMetadata(
        getParamsMetadata,
        instance,
        callback,
        "testMethod",
        "moduleKey"
      );
      
      expect(result.httpStatusCode).toBe(HttpStatus.NO_CONTENT);
      expect(mockAdapter.getStatusByMethod).toHaveBeenCalledWith(HttpMethod.GET);
    });

    it("should detect custom headers", () => {
      const headers = [{ name: "X-Test", value: "test" }];
      spyOn(contextCreator, "reflectResponseHeaders").mockReturnValue(headers);
      
      const result = (contextCreator as any).getExternalMetadata(
        getParamsMetadata,
        instance,
        callback,
        "testMethod",
        "moduleKey"
      );
      
      expect(result.hasCustomHeaders).toBe(true);
      expect(result.responseHeaders).toBe(headers);
    });
  });

  describe("reflectRedirect", () => {
    it("should return redirect metadata", () => {
      const redirectData = { url: "/redirect", statusCode: 301 };
      spyOn(Reflect, "getMetadata").mockReturnValue(redirectData);
      
      const result = contextCreator.reflectRedirect(() => {});
      
      expect(Reflect.getMetadata).toHaveBeenCalledWith(REDIRECT_METADATA, expect.any(Function));
      expect(result).toBe(redirectData);
    });

    it("should return undefined if no redirect metadata", () => {
      spyOn(Reflect, "getMetadata").mockReturnValue(undefined);
      
      const result = contextCreator.reflectRedirect(() => {});
      
      expect(result).toBeUndefined();
    });
  });

  describe("reflectMethod", () => {
    it("should return method metadata", () => {
      spyOn(Reflect, "getMetadata").mockReturnValue(HttpMethod.POST);
      
      const result = contextCreator.reflectMethod(() => {});
      
      expect(Reflect.getMetadata).toHaveBeenCalledWith(METHOD_METADATA, expect.any(Function));
      expect(result).toBe(HttpMethod.POST);
    });

    it("should return undefined if no method metadata", () => {
      spyOn(Reflect, "getMetadata").mockReturnValue(undefined);
      
      const result = contextCreator.reflectMethod(() => {});
      
      expect(result).toBeUndefined();
    });
  });

  describe("reflectResponseHeaders", () => {
    it("should return headers metadata", () => {
      const headers = [{ name: "X-Test", value: "test" }];
      spyOn(Reflect, "getMetadata").mockReturnValue(headers);
      
      const result = contextCreator.reflectResponseHeaders(() => {});
      
      expect(Reflect.getMetadata).toHaveBeenCalledWith(HEADERS_METADATA, expect.any(Function));
      expect(result).toBe(headers);
    });

    it("should return empty array if no headers metadata", () => {
      spyOn(Reflect, "getMetadata").mockReturnValue(undefined);
      
      const result = contextCreator.reflectResponseHeaders(() => {});
      
      expect(result).toEqual([]);
    });
  });

  describe("reflectHttpStatusCode", () => {
    it("should return HTTP status code from reflector", () => {
      // @ts-expect-error Mismatch types
      spyOn(contextCreator, "reflector").mockReturnValue({
        get: mock(() => HttpStatus.CREATED),
      });

      const callback = () => {};
      Reflect.defineMetadata(HttpCode.KEY, HttpStatus.CREATED, callback);
      const result = contextCreator.reflectHttpStatusCode(callback);
      
      expect(contextCreator.reflector.get).toHaveBeenCalledWith(HttpCode, callback);
      expect(result).toBe(HttpStatus.CREATED);
    });

    it("should return undefined if no status code", () => {
      // @ts-expect-error Mismatch types
      spyOn(contextCreator, "reflector").mockReturnValue({
        get: mock(() => undefined),
      });
      
      const result = contextCreator.reflectHttpStatusCode(() => {});
      
      expect(result).toBeUndefined();
    });
  });

  describe("createHandleResponseFn", () => {
    let callback: (...args: unknown[]) => unknown;
    
    beforeEach(() => {
      callback = () => {};
      spyOn(contextCreator, "transformToResult").mockImplementation((result) => Promise.resolve(result));
    });

    it("should create redirect response function", async () => {
      const redirectResponse = { url: "/redirect", statusCode: 301 };
      
      const handleResponse = contextCreator.createHandleResponseFn(
        callback,
        false,
        redirectResponse
      );
      
      const mockCtx = ["request", "response"];
      const result = { url: "/custom", statusCode: 302 };
      
      await handleResponse(result, mockCtx);
      
      expect(mockAdapter.setResponseRedirect).toHaveBeenCalledWith(mockCtx, 302, "/custom");
    });

    it("should use default redirect values when result doesn't have url/statusCode", async () => {
      const redirectResponse = { url: "/default", statusCode: 301 };
      
      const handleResponse = contextCreator.createHandleResponseFn(
        callback,
        false,
        redirectResponse
      );
      
      const mockCtx = ["request", "response"];
      const result = "simple result";
      
      await handleResponse(result, mockCtx);
      
      expect(mockAdapter.setResponseRedirect).toHaveBeenCalledWith(mockCtx, 301, "/default");
    });

    it("should use FOUND status when no statusCode in redirect", async () => {
      const redirectResponse = { url: "/redirect" };
      
      const handleResponse = contextCreator.createHandleResponseFn(
        callback,
        false,
        redirectResponse
      );
      
      const mockCtx = ["request", "response"];
      await handleResponse("result", mockCtx);
      
      expect(mockAdapter.setResponseRedirect).toHaveBeenCalledWith(
        mockCtx, 
        HttpStatus.FOUND, 
        "/redirect"
      );
    });

    it("should create normal response function when no redirect", async () => {
      const handleResponse = contextCreator.createHandleResponseFn(callback, false);
      
      const mockCtx = ["request", "response"];
      const result = { data: "test" };
      
      const returnValue = await handleResponse(result, mockCtx);
      
      expect(mockAdapter.setResponseReply).toHaveBeenCalledWith(mockCtx, result, undefined);
      expect(returnValue).toBe(mockCtx);
    });

    it("should not call setResponseReply when passthrough enabled", async () => {
      const handleResponse = contextCreator.createHandleResponseFn(callback, true);
      
      const mockCtx = ["request", "response"];
      const result = { data: "test" };
      
      const returnValue = await handleResponse(result, mockCtx);
      
      expect(mockAdapter.setResponseReply).not.toHaveBeenCalled();
      expect(returnValue).toBe(mockCtx);
    });
  });

  describe("transformToResult", () => {
    it("should transform Observable to Promise", async () => {
      const observable = of("test value");
      
      const result = await contextCreator.transformToResult(observable);
      
      expect(result).toBe("test value");
    });

    it("should return non-observable value directly", async () => {
      const value = "direct value";
      
      const result = await contextCreator.transformToResult(value);
      
      expect(result).toBe(value);
    });

    it("should handle complex observable", async () => {
      const observable = of({ data: "complex" });
      
      const result = await contextCreator.transformToResult(observable);
      
      expect(result).toEqual({ data: "complex" });
    });

    it("should handle promises", async () => {
      const promise = Promise.resolve("promise value");
      
      const result = await contextCreator.transformToResult(promise);
      
      expect(result).toBe("promise value");
    });
  });
});