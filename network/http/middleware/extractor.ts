import {
  type ExcludeRouteMetadata,
  HttpConfig,
  type RouteInfo,
  type VersioningOptions,
  VersioningType,
  type VersionValue,
} from "@venok/http";
import { RoutePathFactory } from "@venok/http/factory/index.js";
import { addLeadingSlash, isRouteExcluded, stripEndSlash } from "@venok/http/helpers/index.js";

export class RouteInfoPathExtractor {
  private routePathFactory: RoutePathFactory;
  private readonly prefixPath: string;
  private readonly excludedGlobalPrefixRoutes: ExcludeRouteMetadata[];
  private readonly versioningConfig?: VersioningOptions;

  constructor(private readonly httpConfig: HttpConfig) {
    this.routePathFactory = new RoutePathFactory(httpConfig);
    this.prefixPath = stripEndSlash(addLeadingSlash(this.httpConfig.getGlobalPrefix()));
    this.excludedGlobalPrefixRoutes = this.httpConfig.getGlobalPrefixOptions().exclude ?? [];
    this.versioningConfig = this.httpConfig.getVersioning();
  }

  public extractPathsFrom({ path, method, version }: RouteInfo): string[] {
    const versionPath = this.extractVersionPathFrom(version);

    if (this.isAWildcard(path)) {
      return Array.isArray(this.excludedGlobalPrefixRoutes)
        ? [
            this.prefixPath + versionPath + addLeadingSlash(path),
            ...this.excludedGlobalPrefixRoutes.map((route) => versionPath + addLeadingSlash(route.path)),
          ]
        : [this.prefixPath + versionPath + addLeadingSlash(path)];
    }

    return [this.extractNonWildcardPathFrom({ path, method, version })];
  }

  public extractPathFrom(route: RouteInfo): string {
    if (this.isAWildcard(route.path) && !route.version) return addLeadingSlash(route.path);

    return this.extractNonWildcardPathFrom(route);
  }

  private isAWildcard(path: string): boolean {
    return ["*", "/*", "/*/", "(.*)", "/(.*)"].includes(path);
  }

  private extractNonWildcardPathFrom({ path, method, version }: RouteInfo): string {
    const versionPath = this.extractVersionPathFrom(version);

    if (
      Array.isArray(this.excludedGlobalPrefixRoutes) &&
      isRouteExcluded(this.excludedGlobalPrefixRoutes, path, method)
    ) {
      return versionPath + addLeadingSlash(path);
    }

    return this.prefixPath + versionPath + addLeadingSlash(path);
  }

  private extractVersionPathFrom(version?: VersionValue): string {
    if (!version || this.versioningConfig?.type !== VersioningType.URI) return "";

    const versionPrefix = this.routePathFactory.getVersionPrefix(this.versioningConfig);
    return addLeadingSlash(versionPrefix + version.toString());
  }
}
