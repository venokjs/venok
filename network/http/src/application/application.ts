import type { CorsOptions, CorsOptionsDelegate, GlobalPrefixOptions, HttpServer, VersioningOptions } from "~/interfaces/index.js";
import type { HttpConfig } from "~/application/config.js";

import { AbstractHttpAdapter } from "~/adapter/adapter.js";
import { mapToExcludeRoute } from "~/middleware/utils.js";
import { VersioningType } from "~/enums/version-type.enum.js";

export class HttpApplication {
  constructor(
    private readonly httpAdapter: HttpServer,
    private readonly config: HttpConfig
  ) {}

  public use(...args: [any, any?]): this {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this.httpAdapter.useStaticAssets && this.httpAdapter.useStaticAssets(pathOrOptions, options);
    return this;
  }

  public setBaseViewsDir(path: string | string[]): this {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this.httpAdapter.setBaseViewsDir && this.httpAdapter.setBaseViewsDir(path);
    return this;
  }

  public setViewEngine(engineOrOptions: any): this {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this.httpAdapter.setViewEngine && this.httpAdapter.setViewEngine(engineOrOptions);
    return this;
  }

  // public useBodyParser<Options = VenokExpressBodyParserOptions>(
  //   type: VenokExpressBodyParserType,
  //   rawBody: boolean,
  //   options?: Omit<Options, "verify">,
  // ) {
  //   this.httpAdapter.useBodyParser(type, rawBody, options);
  //   return this;
  // }
}
