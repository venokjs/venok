import { HttpInstanceStorage } from "../storage/http-instance.storage";
import { ExcludeRouteMetadata, GlobalPrefixOptions, VersioningOptions } from "../interfaces";

export class HttpConfig {
  private globalPrefix = "";
  private globalPrefixOptions: GlobalPrefixOptions<ExcludeRouteMetadata> = {};
  private versioningOptions!: VersioningOptions;

  private readonly httpInstanceStorage = new HttpInstanceStorage();

  public setHttpAdapter(httpAdapter: any) {
    this.httpInstanceStorage.httpAdapter = httpAdapter;

    if (!this.httpInstanceStorage.httpAdapterHost) return;

    const host = this.httpInstanceStorage.httpAdapterHost;
    host.httpAdapter = httpAdapter;
  }

  public getHttpAdapterRef() {
    return this.httpInstanceStorage.httpAdapter;
  }

  public getHttpAdapterHostRef() {
    return this.httpInstanceStorage.httpAdapterHost;
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
