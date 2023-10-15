import { IncomingMessage } from "http";
import { Observable } from "rxjs";

import { CustomHeader, RedirectResponse, RouterResponseController } from "./response.controller";
import {
  HEADERS_METADATA,
  HTTP_CODE_METADATA,
  REDIRECT_METADATA,
  RENDER_METADATA,
  RESPONSE_PASSTHROUGH_METADATA,
  SSE_METADATA,
} from "../constants";
import { RequestMethod, RouteParamtypes } from "../enums";
import { STATIC_CONTEXT } from "@venok/core/injector/constants";
import { VenokContextCreator } from "@venok/core/context";
import { ContextId, ContextType, PipeTransform } from "@venok/core";
import { ROUTE_ARGS_METADATA } from "@venok/core/constants";
import { isEmpty, isString } from "@venok/core/helpers/shared.helper";
import { HeaderStream } from "../helpers";
import { RouteParamsFactory } from "../factory";
import { HttpServer, RouterProxyCallback } from "../interfaces";
import { RouterExceptionFiltersContext } from "../filters/context";
import { ParamData } from "../decorators";

export interface ParamProperties {
  index: number;
  type: RouteParamtypes | string;
  data: ParamData;
  pipes: PipeTransform[];
  extractValue: <TRequest, TResponse>(req: TRequest, res: TResponse, next: Function) => any;
}

export type HandleResponseFn = HandlerResponseBasicFn | HandleSseResponseFn;

export type HandlerResponseBasicFn = <TResult, TResponse>(result: TResult, res: TResponse, req?: any) => any;

export type HandleSseResponseFn = <
  TResult extends Observable<unknown> = any,
  TResponse extends HeaderStream = any,
  TRequest extends IncomingMessage = any,
>(
  result: TResult,
  res: TResponse,
  req: TRequest,
) => any;

export interface HandlerMetadata {
  argsLength: number;
  paramtypes: any[];
  httpStatusCode: number;
  responseHeaders: any[];
  hasCustomHeaders: boolean;
  getParamsMetadata: (
    moduleKey: string,
    contextId?: ContextId,
    inquirerId?: string,
  ) => (ParamProperties & { metatype?: any })[];
  fnHandleResponse: HandleResponseFn;
}

export interface IRouteParamsFactory {
  exchangeKeyForValue<TRequest extends Record<string, any> = any, TResponse = any, TResult = any>(
    key: RouteParamtypes | string,
    data: any,
    args: [TRequest, TResponse, Function],
  ): TResult;
}

export class HttpContextCreator {
  private readonly responseController: RouterResponseController;
  constructor(
    private readonly venokContextCreator: VenokContextCreator,
    private readonly exceptionsFilter: RouterExceptionFiltersContext,
    private readonly applicationRef: HttpServer,
  ) {
    this.responseController = new RouterResponseController(applicationRef);
  }
  public create(
    instance: Object,
    callback: (...args: any[]) => unknown,
    methodName: string,
    moduleKey: string,
    requestMethod: RequestMethod,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ) {
    const contextType = "http";
    const { fnHandleResponse, httpStatusCode, responseHeaders, hasCustomHeaders } = this.getMetadata(
      instance,
      callback,
      methodName,
      moduleKey,
      requestMethod,
      contextType as ContextType,
    );

    const doneCallback = async <TRequest, TResponse>(result: any, req: TRequest, res: TResponse, next: Function) => {
      this.responseController.setStatus(res, httpStatusCode);
      hasCustomHeaders && this.responseController.setHeaders(res, responseHeaders);
      await (fnHandleResponse as HandlerResponseBasicFn)(result, res, req);
    };

    const result = this.venokContextCreator.create(
      instance,
      callback,
      methodName,
      ROUTE_ARGS_METADATA,
      new RouteParamsFactory(),
      contextId,
      inquirerId,
      {
        guards: true,
        interceptors: true,
        filters: false,
        callback: doneCallback,
      },
      contextType,
    );

    const exceptionFilter = this.exceptionsFilter.create(instance, callback, moduleKey, contextId, inquirerId);
    return this.venokContextCreator.venokProxy.createProxy(result as RouterProxyCallback, exceptionFilter);
  }

  public getMetadata<TContext extends ContextType = ContextType>(
    instance: Object,
    callback: (...args: any[]) => any,
    methodName: string,
    moduleKey: string,
    requestMethod: RequestMethod,
    contextType: TContext,
  ) {
    const metadata =
      this.venokContextCreator.contextUtils.reflectCallbackMetadata(instance, methodName, ROUTE_ARGS_METADATA) || {};
    const keys = Object.keys(metadata);

    const contextFactory = this.venokContextCreator.contextUtils.getContextFactory(contextType, instance, callback);
    const getParamsMetadata = (moduleKey: string, contextId = STATIC_CONTEXT, inquirerId?: string) =>
      this.venokContextCreator.exchangeKeysForValues(
        keys,
        metadata,
        moduleKey,
        new RouteParamsFactory(),
        contextId,
        inquirerId,
        contextFactory,
      );

    const paramsMetadata = getParamsMetadata(moduleKey);
    const isResponseHandled = this.isResponseHandled(instance, methodName, paramsMetadata);

    const httpRedirectResponse = this.reflectRedirect(callback);
    const fnHandleResponse = this.createHandleResponseFn(callback, isResponseHandled, httpRedirectResponse);

    const httpCode = this.reflectHttpStatusCode(callback);
    const httpStatusCode = httpCode ? httpCode : this.responseController.getStatusByMethod(requestMethod);

    const responseHeaders = this.reflectResponseHeaders(callback);
    const hasCustomHeaders = !isEmpty(responseHeaders);
    return {
      fnHandleResponse,
      httpStatusCode,
      hasCustomHeaders,
      responseHeaders,
    };
  }

  public reflectRedirect(callback: (...args: unknown[]) => unknown): RedirectResponse {
    return Reflect.getMetadata(REDIRECT_METADATA, callback);
  }

  public reflectHttpStatusCode(callback: (...args: unknown[]) => unknown): number {
    return Reflect.getMetadata(HTTP_CODE_METADATA, callback);
  }

  public reflectRenderTemplate(callback: (...args: unknown[]) => unknown): string {
    return Reflect.getMetadata(RENDER_METADATA, callback);
  }

  public reflectResponseHeaders(callback: (...args: unknown[]) => unknown): CustomHeader[] {
    return Reflect.getMetadata(HEADERS_METADATA, callback) || [];
  }

  public reflectSse(callback: (...args: unknown[]) => unknown): string {
    return Reflect.getMetadata(SSE_METADATA, callback);
  }

  public createHandleResponseFn(
    callback: (...args: unknown[]) => unknown,
    isResponseHandled: boolean,
    redirectResponse?: RedirectResponse,
    httpStatusCode?: number,
  ): HandleResponseFn {
    const renderTemplate = this.reflectRenderTemplate(callback);
    if (renderTemplate) {
      return async <TResult, TResponse>(result: TResult, res: TResponse) => {
        return await this.responseController.render(result, res, renderTemplate);
      };
    }
    if (redirectResponse && isString(redirectResponse.url)) {
      return async <TResult, TResponse>(result: TResult, res: TResponse) => {
        await this.responseController.redirect(result, res, redirectResponse);
      };
    }
    const isSseHandler = !!this.reflectSse(callback);
    if (isSseHandler) {
      return <
        TResult extends Observable<unknown> = any,
        TResponse extends HeaderStream = any,
        TRequest extends IncomingMessage = any,
      >(
        result: TResult,
        res: TResponse,
        req: TRequest,
      ) => {
        this.responseController.sse(result, (res as any).raw || res, (req as any).raw || req, {
          additionalHeaders: res.getHeaders?.() as any,
        });
      };
    }
    return async <TResult, TResponse>(result: TResult, res: TResponse) => {
      result = await this.responseController.transformToResult(result);
      !isResponseHandled && (await this.responseController.apply(result, res, httpStatusCode));
      return res;
    };
  }

  private isResponseHandled(instance: Object, methodName: string, paramsMetadata: ParamProperties[]): boolean {
    const hasResponseOrNextDecorator = paramsMetadata.some(
      ({ type }) => type === RouteParamtypes.RESPONSE || type === RouteParamtypes.NEXT,
    );

    const isPassthroughEnabled = Reflect.getMetadata(RESPONSE_PASSTHROUGH_METADATA, instance.constructor, methodName);
    return hasResponseOrNextDecorator && !isPassthroughEnabled;
  }
}
