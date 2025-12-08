import type { ApplicationConfig, VenokContainer, VenokExceptionFilterContext, VenokParamsFactoryInterface } from "@venok/core";

import type { AdapterInstanceRouteMetadata, AdapterMiddlewareMetadata, AdapterPathMiddlewareMetadata, AdapterRouteMetadata, VersioningOptions, VersionValue } from "~/interfaces/index.js";

import { isFunction, isNumber, isString, isUndefined, VenokProxy } from "@venok/core";

import {
  VENOK_ADAPTER_ADD_MIDDLEWARE,
  VENOK_ADAPTER_ADD_ROUTE,
  VENOK_ADAPTER_BUILD,
  VENOK_ADAPTER_SET_EXCEPTION_FILTER,
  VENOK_ADAPTER_TRANSFORM_NATIVE_ARGS_TO_CONTEXT,
  VENOK_APPLY_ROUTES_TO_INSTANCE
} from "~/symbols.js";
import { VERSION_NEUTRAL } from "~/interfaces/router/version.interface.js";

import { buildMiddlewareTree, getMiddlewaresForPattern } from "~/middleware/tree.js";

import { mapToExcludeRoute } from "~/helpers/middleware.helper.js";
import { isRouteExcluded } from "~/helpers/route.helper.js";
import { getPathType } from "~/helpers/path.helper.js";

import { HttpVersioningType } from "~/enums/version-type.enum.js";
import { HttpMethod } from "~/enums/method.enum.js";

import { ForbiddenException } from "~/exceptions/forbidden.exception.js";
import { NotFoundException } from "~/exceptions/not-found.exception.js";

import { HttpExceptionFiltersContext } from "~/filters/context.js";

const isStringEmptyOrSpaces = (str: string) => {
  return str === null || str.match(/^ *$/) !== null;
};

export abstract class AbstractHttpAdapter<Instance = any, Context extends any[] = any[]> {
  readonly #instance: Instance;
  #filterContext!: VenokExceptionFilterContext;

  constructor(instance: Instance) {
    this.#instance = instance;
  }

  public get instance(): Instance {
    return this.#instance;
  }

  protected readonly routes: Map<string, AdapterRouteMetadata> = new Map();

  protected readonly globalVenokMiddlewares: Set<Function> = new Set();
  protected readonly exactVenokMiddlewares: Map<string, AdapterPathMiddlewareMetadata[]> = new Map();
  protected readonly patternVenokMiddlewares: Map<string, AdapterPathMiddlewareMetadata[]> = new Map();
  
  private convertMiddlewares(collection: Map<string, AdapterPathMiddlewareMetadata[]>): AdapterMiddlewareMetadata[] {
    return [...collection].map(([path, handlers]) => ({ path, handlers }));
  }

  private applyMiddlewareFilterToHandler(metadata: AdapterPathMiddlewareMetadata){
    if (metadata.excludedPaths) {
      const excludedPaths = mapToExcludeRoute(metadata.excludedPaths);

      return async (context: Context) => {
        const reqMethod = this.getRequestMethod(context);
        const originalUrl = this.getRequestUrl(context);
        const queryParamsIndex = originalUrl && originalUrl.indexOf("?");
        const pathname = isNumber(queryParamsIndex) && queryParamsIndex >= 0
          ? originalUrl.slice(0, +queryParamsIndex)
          : originalUrl;

        const excluded = isRouteExcluded(excludedPaths, pathname, reqMethod);

        if (excluded) return;

        const result = await metadata.use(context);
        if (result) this.setResponseReply(context, result);
      };
    }

    return async (context: Context) => {
      const result = await metadata.use(context);
      if (result) this.setResponseReply(context, result);
    };
  }

  private applyHostFilterToHandler(handler: (context: Context) => void, hosts: { regexp: RegExp, keys: any[] }[]): Function {
    return (context: Context)=> {
      const parsedHosts: Record<string, string> = {};

      const hostname = this.getRequestHostname(context) || "";

      for (const exp of hosts) {
        const match = hostname.match(exp.regexp);
        if (match) {
          if (exp.keys.length > 0) {
            exp.keys.forEach((key, i) => (parsedHosts[key.name] = match[i + 1]));
          } else if (exp.regexp && match.groups) {
            for (const groupName in match.groups) parsedHosts[groupName] = match.groups[groupName];
          }
          this.addAdditionalProp(context, "hosts", parsedHosts);
          return handler(context);
        }
      }

      throw new ForbiddenException(`Request from this host (${hostname}) is prohibited`);
    };
  }

  private applyVersionFilterToHandler(handler: (context: Context) => void, version: VersionValue, options: VersioningOptions): Function {
    return (originalContext: Context) => {
      // URL Versioning is done via the path, so the filter continues forward
      if (version === VERSION_NEUTRAL || options.type === HttpVersioningType.URI) return handler(originalContext);

      // Custom Extractor Versioning Handler
      if (options.type === HttpVersioningType.CUSTOM) {
        const handlerForCustomVersioning = (context: Context) => {
          const extractedVersion = options.extractor(context);

          if (Array.isArray(version)) {
            const isVersionIncluded = version.filter((v) => extractedVersion.includes(v as string));
            if (Array.isArray(extractedVersion) && isVersionIncluded.length) return handler(context);

            if (isString(extractedVersion) && version.includes(extractedVersion)) return handler(context);
          } else if (isString(version)) {
            // Known bug here - if there are multiple versions supported across separate
            // handlers/controllers, we can't select the highest matching handler.
            // Since this code is evaluated per-handler, then we can't see if the highest
            // specified version exists in a different handler.
            if (Array.isArray(extractedVersion) && extractedVersion.includes(version)) return handler(context);

            if (isString(extractedVersion) && version === extractedVersion) return handler(context);
          }

          return;
        };

        return handlerForCustomVersioning(originalContext);
      }

      // Media Type (Accept Header) Versioning Handler
      if (options.type === HttpVersioningType.MEDIA_TYPE) {
        const handlerForMediaTypeVersioning = (context: Context) => {
          const MEDIA_TYPE_HEADER = "Accept";
          const headers = this.getRequestHeaders(context);
          const acceptHeaderValue: string | undefined = headers?.[MEDIA_TYPE_HEADER] || headers?.[MEDIA_TYPE_HEADER.toLowerCase()];

          const acceptHeaderVersionParameter = acceptHeaderValue ? acceptHeaderValue.split(";")[1] : undefined;

          // No version was supplied
          if (isUndefined(acceptHeaderVersionParameter)) {
            if (Array.isArray(version)) if (version.includes(VERSION_NEUTRAL)) return handler(context);
          } else {
            const headerVersion = acceptHeaderVersionParameter.split(options.key)[1];

            if (Array.isArray(version)) if (version.includes(headerVersion)) return handler(context);
            else if (isString(version)) if (version === headerVersion) return handler(context);
          }

          return;
        };

        return handlerForMediaTypeVersioning(originalContext);
      }

      // Header Versioning Handler
      if (options.type === HttpVersioningType.HEADER) {
        const handlerForHeaderVersioning = (context: Context) => {
          const headers = this.getRequestHeaders(context);
          const customHeaderVersionParameter: string | undefined = headers?.[options.header] || headers?.[options.header.toLowerCase()];

          // No version was supplied
          if (isUndefined(customHeaderVersionParameter) || isStringEmptyOrSpaces(customHeaderVersionParameter || "")) {
            if (Array.isArray(version) && version.includes(VERSION_NEUTRAL)) return handler(context);
          } else {
            if (Array.isArray(version)) {
              if (version.includes(customHeaderVersionParameter?.toString())) return handler(context);
            } else if (isString(version)) {
              if (version === customHeaderVersionParameter?.toString()) return handler(context);
            }
          }

          return;
        };

        return handlerForHeaderVersioning(originalContext);
      }
    };
  }

  private async runChain(context: Context, handlers: Function[]){
    for (const handler of handlers) {
      if (this.isResponseHandled(context)) break;
      await handler(context);
    }

    if (!this.isResponseHandled(context)) throw new NotFoundException();
  }

  protected createExceptionHandler(callback: (...args: any[]) => void): ReturnType<VenokExceptionFilterContext["create"]> {
    // @ts-expect-error Mismatch types
    return this.#filterContext.create({}, callback, undefined);
  }

  abstract listen(port: number, hostname: string, callback: (...args: any[]) => Promise<void>): Promise<void>;

  abstract close(): Promise<void>;

  abstract [VENOK_APPLY_ROUTES_TO_INSTANCE](routes: Map<string, AdapterInstanceRouteMetadata>): void;

  [VENOK_ADAPTER_SET_EXCEPTION_FILTER](container: VenokContainer, config: ApplicationConfig) {
    this.#filterContext = new HttpExceptionFiltersContext(container, config);
  }

  [VENOK_ADAPTER_BUILD]() {
    const middlewares: AdapterMiddlewareMetadata[] = [
      ...this.convertMiddlewares(this.exactVenokMiddlewares),
      ...this.convertMiddlewares(this.patternVenokMiddlewares),
    ];
    const tree = buildMiddlewareTree(middlewares);
    const result = new Map<string, AdapterInstanceRouteMetadata>();
    const venokProxy = new VenokProxy();

    for (const [path, metadata] of this.routes) {
      const mws = getMiddlewaresForPattern(tree, path, metadata.method);

      const proxiedMiddlewares = mws
        .map(m => m.handlers.map(
          metadata => this.applyMiddlewareFilterToHandler(metadata))
        ).flat(2);

      const proxiedHandlers = metadata.handlers.map(handlerMetadata => {
        let callback = handlerMetadata.handler as (context: Context) => void;
        if (metadata.useHostFilter) {
          callback = this.applyHostFilterToHandler(
            callback,
            metadata.hosts!
          ) as (context: Context) => void;
        }
        if (metadata.useVersionFilter) {
          callback = this.applyVersionFilterToHandler(
            callback,
            handlerMetadata.version!,
            metadata.versioningOptions!
          ) as (context: Context) => void;
        }

        return callback;
      });

      const chain = [...proxiedMiddlewares, ...proxiedHandlers];

      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      const handler = this.createExceptionHandler(this.runChain.bind(this));
      const proxy = venokProxy.createProxy(this.runChain.bind(this), handler);

      const instanceCallback = async (...args: any[]) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const context = this[VENOK_ADAPTER_TRANSFORM_NATIVE_ARGS_TO_CONTEXT](...args);
        await proxy(context, chain);
      };

      result.set(path, { handler: instanceCallback, method: metadata.method });
    }

    return result;
  }
  
  public use(handler: Function): any;
  public use(path: string, handler: Function) : any;
  public use(pathOrHandler: string | Function, handler?: Function): any {
    if (isString(pathOrHandler)) {
      if (!isFunction(handler)) {
        console.error();
        return this;
      }

      if (getPathType(pathOrHandler) === "static") this.addUserMiddleware(this.exactVenokMiddlewares, pathOrHandler, { use: handler, method: HttpMethod.ALL });
      else this.addUserMiddleware(this.patternVenokMiddlewares, pathOrHandler, { use: handler, method: HttpMethod.ALL });

      return this;
    }

    this.globalVenokMiddlewares.add(pathOrHandler);
    return this;
  }

  public get(path: string, handler: (...args: any[]) => any): any { return this.addUserRoute(path, HttpMethod.GET, handler); }
  public post(path: string, handler: (...args: any[]) => any): any { return this.addUserRoute(path, HttpMethod.POST, handler); }
  public put(path: string, handler: (...args: any[]) => any): any { return this.addUserRoute(path, HttpMethod.PUT, handler); }
  public delete(path: string, handler: (...args: any[]) => any): any { return this.addUserRoute(path, HttpMethod.DELETE, handler); }
  public patch(path: string, handler: (...args: any[]) => any): any { return this.addUserRoute(path, HttpMethod.PATCH, handler); }
  public all(path: string, handler: (...args: any[]) => any): any { return this.addUserRoute(path, HttpMethod.ALL, handler); }
  public options(path: string, handler: (...args: any[]) => any): any { return this.addUserRoute(path, HttpMethod.OPTIONS, handler); }
  public head(path: string, handler: (...args: any[]) => any): any { return this.addUserRoute(path, HttpMethod.HEAD, handler); }
  public search(path: string, handler: (...args: any[]) => any): any { return this.addUserRoute(path, HttpMethod.SEARCH, handler); }

  public [VENOK_ADAPTER_ADD_ROUTE](path: string, info: AdapterRouteMetadata): any {
    if (!this.routes.has(path)) {
      this.routes.set(path, info);
      return this;
    }

    this.routes.get(path)!.handlers.push(info.handlers[0]);
    return this;
  }

  public [VENOK_ADAPTER_ADD_MIDDLEWARE](path: string, metadata: AdapterPathMiddlewareMetadata) {
    if (getPathType(path) === "static") this.addUserMiddleware(this.exactVenokMiddlewares, path, metadata);
    else this.addUserMiddleware(this.patternVenokMiddlewares, path, metadata);

    return this;
  }

  private addUserMiddleware(
    collection: Map<string, AdapterPathMiddlewareMetadata[]>,
    path: string,
    metadata: AdapterPathMiddlewareMetadata
  ) {
    if (collection.has(path)) collection.get(path)!.push(metadata);
    else collection.set(path, [metadata]);
  }

  private addUserRoute(path: string, method: HttpMethod, handler: (...args: any[]) => any): any {
    if (this.routes.has(path)) throw new Error();
    
    const route: AdapterRouteMetadata = {
      useVersionFilter: false,
      useHostFilter: false,
      method,
      handlers: [{ handler: handler }],
    };

    this.routes.set(path, route);

    return this;
  }

  public abstract [VENOK_ADAPTER_TRANSFORM_NATIVE_ARGS_TO_CONTEXT](...args: any[]): Context;
  public abstract getParamsFactory(): VenokParamsFactoryInterface;

  abstract isResponseHandled(ctx: Context): boolean;

  abstract getStatusByMethod(requestMethod: HttpMethod): number;
  abstract addAdditionalProp(ctx: Context, key: string, value: any): void;

  public abstract getRequestMethod(ctx: Context): HttpMethod;
  public abstract getRequestUrl(ctx: Context): string;
  public abstract getRequestHostname(ctx: Context): string;
  public abstract getRequestHeaders(ctx: Context): Record<string, string>;

  public abstract setResponseStatus(ctx: Context, statusCode: number): any;
  public abstract setResponseRedirect(ctx: Context, statusCode: number, url: string): any;
  public abstract setResponseHeader(ctx: Context, name: string, value: string): any;
  public abstract setResponseReply(ctx: Context, result: any, statusCode?: number): any;

  abstract registerNotFoundHandler(): void;
  abstract registerExceptionHandler(): void;
}