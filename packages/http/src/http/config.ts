import type {
  ExcludeRouteMetadata,
  GlobalPrefixOptions,
  HttpAppOptions,
  VersioningOptions
} from "~/interfaces/index.js";
import type { AbstractHttpAdapter } from "~/http/adapter.js";

import { Inject, Injectable } from "@venok/core";

import { HTTP_APP_OPTIONS } from "~/http/configurable-module.js";

@Injectable()
export class HttpConfig<T extends AbstractHttpAdapter = AbstractHttpAdapter> {
  private globalPrefix = "";
  private globalPrefixOptions: GlobalPrefixOptions<ExcludeRouteMetadata> = {};
  private versioningOptions!: VersioningOptions;

  private adapter: T;

  constructor(@Inject(HTTP_APP_OPTIONS) private readonly options: Required<HttpAppOptions>) {
    this.adapter = this.options.adapter as T;
  }

  public setHttpAdapter(httpAdapter: T) {
    this.adapter = httpAdapter;
  }

  public getHttpAdapterRef(): T {
    return this.adapter;
  }

  public setGlobalPrefix(prefix: string) {
    this.globalPrefix = prefix;
  }

  public getGlobalPrefix() {
    return this.globalPrefix;
  }

  public setGlobalPrefixOptions(options: GlobalPrefixOptions<ExcludeRouteMetadata>) {
    this.globalPrefixOptions = options;
  }

  public getGlobalPrefixOptions(): GlobalPrefixOptions<ExcludeRouteMetadata> {
    return this.globalPrefixOptions;
  }

  public enableVersioning(options: VersioningOptions): void {
    if (Array.isArray(options.defaultVersion)) {
      // Drop duplicated versions
      options.defaultVersion = Array.from(new Set(options.defaultVersion));
    }

    this.versioningOptions = options;
  }

  public getVersioning(): VersioningOptions | undefined {
    return this.versioningOptions;
  }
}
