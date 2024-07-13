import { ExternalContextOptions, VenokContextCreator } from "@venok/core/context";
import {
  ApplicationContext,
  ContextType,
  ParamsMetadata,
  PipeTransform,
  VenokParamsFactoryInterface,
} from "@venok/core";
import { ContextId, STATIC_CONTEXT } from "@venok/core/injector";
import { isEmpty, isString } from "@venok/core/helpers";
import { CustomHeader, RedirectResponse, RouterResponseController } from "@venok/http/context/response.controller";
import {
  HEADERS_METADATA,
  METHOD_METADATA,
  REDIRECT_METADATA,
  RESPONSE_PASSTHROUGH_METADATA,
} from "@venok/http/constants";
import { RequestMethod, RouteParamtypes } from "@venok/http/enums";
import { Observable } from "rxjs";
import { HeaderStream } from "@venok/http/helpers";
import { IncomingMessage } from "http";
import { HttpConfig } from "@venok/http/application/config";
import { RouterProxyCallback } from "@venok/http/interfaces";
import { HttpCode, ParamData, Render, Sse } from "@venok/http/decorators";

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

export class HttpContextCreator extends VenokContextCreator {
  private _responseController!: RouterResponseController;

  private get responseController() {
    if (this._responseController) return this._responseController;
    const context = new ApplicationContext(this.container, this.container.applicationConfig);
    context.selectContextModule();
    this._responseController = new RouterResponseController(context.get(HttpConfig).getHttpAdapterRef());
    return this._responseController;
  }

  public override create<
    TParamsMetadata extends ParamsMetadata = ParamsMetadata,
    TContext extends string = ContextType,
  >(
    instance: object,
    callback: (...args: unknown[]) => unknown,
    methodName: string,
    metadataKey?: string,
    paramsFactory?: VenokParamsFactoryInterface,
    contextId: ContextId = STATIC_CONTEXT,
    inquirerId?: string,
    options: ExternalContextOptions = {
      interceptors: true,
      guards: true,
      filters: false,
      callback: () => {},
    },
    contextType: TContext = "native" as TContext,
  ): (...args: any[]) => Promise<any> {
    const moduleKey = this.getContextModuleKey(instance.constructor);
    const { getParamsMetadata } = super.getMetadata(
      instance,
      methodName,
      metadataKey,
      paramsFactory,
      contextType as any,
    );

    const { fnHandleResponse, httpStatusCode, responseHeaders, hasCustomHeaders } = this.getExternalMetadata(
      getParamsMetadata,
      instance,
      callback,
      methodName,
      moduleKey,
    );

    const doneCallback = async <TRequest, TResponse>(result: any, req: TRequest, res: TResponse, next: Function) => {
      this.responseController.setStatus(res, httpStatusCode);
      hasCustomHeaders && this.responseController.setHeaders(res, responseHeaders);
      await (fnHandleResponse as HandlerResponseBasicFn)(result, res, req);
    };

    const result = super.create(
      instance,
      callback,
      methodName,
      metadataKey,
      paramsFactory,
      contextId,
      inquirerId,
      { ...options, callback: doneCallback },
      contextType as any,
    );

    const exceptionFilter = this.filtersContextCreator.create(instance, callback, moduleKey, contextId, inquirerId);
    return this.venokProxy.createProxy(result as RouterProxyCallback, exceptionFilter);
  }

  private getExternalMetadata<TContext extends ContextType = ContextType>(
    getParamsMetadata: (
      moduleKey: string,
      contextId?: ContextId | undefined,
      inquirerId?: string | undefined,
    ) => ParamProperties[],
    instance: Object,
    callback: (...args: any[]) => any,
    methodName: string,
    moduleKey: string,
  ) {
    const paramsMetadata = getParamsMetadata(moduleKey);
    const isResponseHandled = this.isResponseHandled(instance, methodName, paramsMetadata);

    const httpRedirectResponse = this.reflectRedirect(callback);
    const fnHandleResponse = this.createHandleResponseFn(callback, isResponseHandled, httpRedirectResponse);

    const method = this.reflectMethod(callback);
    const httpCode = this.reflectHttpStatusCode(callback);
    const httpStatusCode = httpCode ? httpCode : this.responseController.getStatusByMethod(method);

    const responseHeaders = this.reflectResponseHeaders(callback);
    const hasCustomHeaders = !isEmpty(responseHeaders);
    return {
      fnHandleResponse,
      httpStatusCode,
      hasCustomHeaders,
      responseHeaders,
    };
  }

  // Remove
  public reflectRedirect(callback: (...args: unknown[]) => unknown): RedirectResponse {
    return Reflect.getMetadata(REDIRECT_METADATA, callback);
  }

  public reflectMethod(callback: (...args: unknown[]) => unknown): RequestMethod {
    return Reflect.getMetadata(METHOD_METADATA, callback);
  }

  public reflectResponseHeaders(callback: (...args: unknown[]) => unknown): CustomHeader[] {
    return Reflect.getMetadata(HEADERS_METADATA, callback) || [];
  }

  public reflectHttpStatusCode(callback: (...args: unknown[]) => unknown): number {
    return this.reflector.get(HttpCode, callback);
  }

  public reflectRenderTemplate(callback: (...args: unknown[]) => unknown): string {
    return this.reflector.get(Render, callback);
  }

  public reflectSse(callback: (...args: unknown[]) => unknown): boolean {
    return this.reflector.has(Sse, callback);
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

    const isSseHandler = this.reflectSse(callback);
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
