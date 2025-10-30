import type { CorsOptions, CorsOptionsDelegate, HttpServer, RequestHandler, VenokApplicationOptions, VersioningOptions, VersionValue } from "~/interfaces/index.js";

import { RequestMethod } from "~/enums/request-method.enum.js";

/**
 * @publicApi
 */
export abstract class AbstractHttpAdapter<TServer = any, TRequest = any, TResponse = any>
implements HttpServer<TRequest, TResponse> {
  protected httpServer!: TServer;

  constructor(protected instance?: any) {}

  public async init() {}

  public use(...args: any[]) {
    return this.instance.use(...args);
  }

  public get(handler: RequestHandler): any;
  public get(path: any, handler: RequestHandler): any;
  public get(...args: any[]) {
    return this.instance.get(...args);
  }

  public post(handler: RequestHandler): any;
  public post(path: any, handler: RequestHandler): any;
  public post(...args: any[]) {
    return this.instance.post(...args);
  }

  public head(handler: RequestHandler): any;
  public head(path: any, handler: RequestHandler): any;
  public head(...args: any[]) {
    return this.instance.head(...args);
  }

  public delete(handler: RequestHandler): any;
  public delete(path: any, handler: RequestHandler): any;
  public delete(...args: any[]) {
    return this.instance.delete(...args);
  }

  public put(handler: RequestHandler): any;
  public put(path: any, handler: RequestHandler): any;
  public put(...args: any[]) {
    return this.instance.put(...args);
  }

  public patch(handler: RequestHandler): any;
  public patch(path: any, handler: RequestHandler): any;
  public patch(...args: any[]) {
    return this.instance.patch(...args);
  }

  public all(handler: RequestHandler): any;
  public all(path: any, handler: RequestHandler): any;
  public all(...args: any[]) {
    return this.instance.all(...args);
  }

  public search(port: string | number, callback?: () => void): any;
  public search(port: string | number, hostname: string, callback?: () => void): any;
  public search(port: any, hostname?: any, callback?: any) {
    return this.instance.search(port, hostname, callback);
  }

  public options(handler: RequestHandler): any;
  public options(path: any, handler: RequestHandler): any;
  public options(...args: any[]) {
    return this.instance.options(...args);
  }

  public listen(port: string | number, callback?: () => void): void;
  public listen(port: string | number, hostname: string, callback?: () => void): void;
  public listen(port: any, hostname?: any, callback?: any): void {
    return this.instance.listen(port, hostname, callback);
  }

  public getHttpServer(): TServer {
    return this.httpServer;
  }

  public setHttpServer(httpServer: TServer) {
    this.httpServer = httpServer;
  }

  public setInstance<T = any>(instance: T) {
    this.instance = instance;
  }

  public getInstance<T = any>(): T {
    return this.instance as T;
  }

  abstract close(): this | Promise<this>;

  abstract initHttpServer(options: VenokApplicationOptions): this;

  abstract useStaticAssets(...args: any[]): this;

  abstract setViewEngine(engine: string): this;

  abstract getRequestHostname(request: any): any;

  abstract getRequestMethod(request: any): any;

  abstract getRequestUrl(request: any): any;

  abstract status(response: any, statusCode: number): any;

  abstract reply(response: any, body: any, statusCode?: number): any;

  abstract end(response: any, message?: string): any;

  abstract render(response: any, view: string, options: any): any;

  abstract redirect(response: any, statusCode: number, url: string): any;

  abstract setErrorHandler(handler: Function, prefix?: string): any;

  abstract setNotFoundHandler(handler: Function, prefix?: string): any;

  abstract isHeadersSent(response: any): any;

  abstract setHeader(response: any, name: string, value: string): any;

  abstract registerParserMiddleware(prefix?: string, rawBody?: boolean): any;

  abstract enableCors(options: CorsOptions | CorsOptionsDelegate<TRequest>, prefix?: string): any;

  abstract createMiddlewareFactory(
    requestMethod: RequestMethod,
  ): ((path: string, callback: Function) => any) | Promise<(path: string, callback: Function) => any>;

  abstract getType(): string;

  abstract applyVersionFilter(
    handler: Function,
    version: VersionValue,
    versioningOptions: VersioningOptions,
  ): (req: TRequest, res: TResponse, next: () => void) => Function;
}
