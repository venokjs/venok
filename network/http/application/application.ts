import { CorsOptions, CorsOptionsDelegate, GlobalPrefixOptions, HttpServer, VersioningOptions } from "../interfaces";
import { HttpConfig } from "./config";
import { AbstractHttpAdapter } from "../adapter/adapter";
import { VersioningType } from "../enums";
import { mapToExcludeRoute } from "../middleware/utils";

export class HttpApplication {
  private start: boolean = false;
  constructor(
    private readonly httpAdapter: HttpServer,
    private readonly config: HttpConfig,
  ) {}

  public use(...args: [any, any?]): this {
    this.httpAdapter.use(...args);
    return this;
  }

  public getHttpAdapter(): AbstractHttpAdapter {
    return this.httpAdapter as AbstractHttpAdapter;
  }

  public enableCors(options?: CorsOptions | CorsOptionsDelegate<any>): this {
    this.httpAdapter.enableCors(options as CorsOptions);
    return this;
  }

  public enableVersioning(options: VersioningOptions = { type: VersioningType.URI }): this {
    this.config.enableVersioning(options);
    return this;
  }
  public setGlobalPrefix(prefix: string, options?: GlobalPrefixOptions): this {
    this.config.setGlobalPrefix(prefix);
    if (options) {
      const exclude = options?.exclude ? mapToExcludeRoute(options.exclude) : [];
      this.config.setGlobalPrefixOptions({
        ...options,
        exclude,
      });
    }
    return this;
  }

  public useStaticAssets(options: any): this;
  public useStaticAssets(path: string, options?: any): this;
  public useStaticAssets(pathOrOptions: any, options?: any): this {
    this.httpAdapter.useStaticAssets && this.httpAdapter.useStaticAssets(pathOrOptions, options);
    return this;
  }

  public setBaseViewsDir(path: string | string[]): this {
    this.httpAdapter.setBaseViewsDir && this.httpAdapter.setBaseViewsDir(path);
    return this;
  }

  public setViewEngine(engineOrOptions: any): this {
    this.httpAdapter.setViewEngine && this.httpAdapter.setViewEngine(engineOrOptions);
    return this;
  }
}
