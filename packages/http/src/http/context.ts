import type {
  ContextId,
  ContextType,
  ExternalContextOptions,
  ParamProperties,
  ParamsMetadata,
  VenokParamsFactoryInterface
} from "@venok/core";
import type { AbstractHttpAdapter } from "~/http/adapter.js";
import type { HttpMethod } from "~/enums/method.enum.js";

import { ApplicationContext, isEmpty, isString, STATIC_CONTEXT, VenokContextCreator } from "@venok/core";
import { isObservable, lastValueFrom } from "rxjs";

import {
  HEADERS_METADATA,
  METHOD_METADATA,
  REDIRECT_METADATA,
  RESPONSE_PASSTHROUGH_METADATA
} from "~/constants.js";
import { HttpCode } from "~/decorators/http-code.decorator.js";

import { HttpParamtypes } from "~/enums/paramtypes.enum.js";
import { HttpStatus } from "~/enums/status.enum.js";

import { HttpConfig } from "~/http/config.js";

interface CustomHeader {
  name: string;
  value: string;
}

interface RedirectResponse {
  url: string;
  statusCode?: number;
}

type HandleResponseFn = <TResult>(result: TResult, ctx: any[]) => any;

export class HttpContextCreator extends VenokContextCreator {
  private _adapter!: AbstractHttpAdapter;

  private get adapter() {
    if (this._adapter) return this._adapter;
    const context = new ApplicationContext(this.container, this.container.applicationConfig);
    this._adapter = context.get(HttpConfig).getHttpAdapterRef();
    return this._adapter;
  }

  public override create<
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TParamsMetadata extends ParamsMetadata = ParamsMetadata,
    TContext extends string = ContextType
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
      callback: undefined,
    },
    contextType: TContext = "http" as TContext
  ): (...args: any[]) => Promise<any> {
    const moduleKey = this.getContextModuleKey(instance.constructor);
    const { getParamsMetadata } = super.getMetadata(
      instance,
      methodName,
      metadataKey,
      paramsFactory,
      contextType as any
    );

    const { fnHandleResponse, httpStatusCode, responseHeaders, hasCustomHeaders } = this.getExternalMetadata(
      getParamsMetadata,
      instance,
      callback,
      methodName,
      moduleKey
    );

    const doneCallback = async (result: any, ctx: any[]) => {
      this.adapter.setResponseStatus(ctx, httpStatusCode);
      if (hasCustomHeaders) {
        responseHeaders.forEach(({ name, value }) => this.adapter.setResponseHeader(ctx, name, value));
      }
      await (fnHandleResponse)(result, ctx);
    };

    const result = super.create(
      instance,
      callback,
      methodName,
      metadataKey,
      paramsFactory,
      contextId,
      inquirerId,
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      { ...options, callback: doneCallback },
      contextType as any
    );

    const exceptionFilter = this.filtersContextCreator.create(instance, callback, moduleKey, contextId, inquirerId);
    return this.venokProxy.createProxy(result, exceptionFilter, contextType);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private getExternalMetadata<TContext extends ContextType = ContextType>(
    getParamsMetadata: (
      moduleKey: string,
      contextId?: ContextId,
      inquirerId?: string
    ) => ParamProperties[],
    instance: object,
    callback: (...args: any[]) => any,
    methodName: string,
    moduleKey: string
  ) {
    const paramsMetadata = getParamsMetadata(moduleKey);
    const isResponsePassthrough = this.isResponsePassthrough(instance, methodName, paramsMetadata);

    const httpRedirectResponse = this.reflectRedirect(callback);
    const fnHandleResponse = this.createHandleResponseFn(callback, isResponsePassthrough, httpRedirectResponse);

    const method = this.reflectMethod(callback);
    const httpCode = this.reflectHttpStatusCode(callback);
    const httpStatusCode = httpCode ? httpCode : this.adapter.getStatusByMethod(method);

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

  public reflectMethod(callback: (...args: unknown[]) => unknown): HttpMethod {
    return Reflect.getMetadata(METHOD_METADATA, callback);
  }

  public reflectResponseHeaders(callback: (...args: unknown[]) => unknown): CustomHeader[] {
    return Reflect.getMetadata(HEADERS_METADATA, callback) || [];
  }

  public reflectHttpStatusCode(callback: (...args: unknown[]) => unknown): number {
    return this.reflector.get(HttpCode, callback);
  }

  public createHandleResponseFn(
    callback: (...args: unknown[]) => unknown,
    isResponsePassthrough: boolean,
    redirectResponse?: RedirectResponse
  ): HandleResponseFn {
    if (redirectResponse && isString(redirectResponse.url)) {
      return async <TResult = any>(result: TResult, ctx: any[]) => {
        result = await this.transformToResult(result);
        const statusCode: number =
          result && (result as any).statusCode
            ? (result as any).statusCode
            : redirectResponse.statusCode
              ? redirectResponse.statusCode
              : HttpStatus.FOUND;
        const url: string = result && (result as any).url ? (result as any).url : redirectResponse.url;

        await this.adapter.setResponseRedirect(ctx, statusCode, url);
      };
    }

    return async <TResult>(result: TResult, ctx: any[]) => {
      result = await this.transformToResult(result);

      !isResponsePassthrough && (await this.adapter.setResponseReply(ctx, result, undefined));
      return ctx;
    };
  }

  public async transformToResult(resultOrDeferred: any) {
    if (isObservable(resultOrDeferred)) return lastValueFrom(resultOrDeferred);

    return resultOrDeferred;
  }

  private isResponsePassthrough(instance: object, methodName: string, paramsMetadata: ParamProperties[]): boolean {
    const hasResponseOrNextDecorator = paramsMetadata.some(({ type }) => type === HttpParamtypes.CONTEXT);

    const isPassthroughEnabled = Reflect.getMetadata(RESPONSE_PASSTHROUGH_METADATA, instance.constructor, methodName);
    return hasResponseOrNextDecorator && !isPassthroughEnabled;
  }
}
