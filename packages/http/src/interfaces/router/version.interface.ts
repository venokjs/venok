import type { HttpVersioningType } from "~/enums/version-type.enum.js";

/**
 * Indicates that this will work for any version passed in the request, or no version.
 */
export const VERSION_NEUTRAL = Symbol("VERSION_NEUTRAL");

export type VersionValue = string | typeof VERSION_NEUTRAL | Array<string | typeof VERSION_NEUTRAL>;

export interface VersionOptions {
  /**
   * Specifies an optional API Version. When configured, methods
   * within the controller will only be routed if the request version
   * matches the specified value.
   *
   * Supported only by HTTP-based application.
   *
   */
  version?: VersionValue;
}

export interface HeaderVersioningOptions {
  type: HttpVersioningType.HEADER;
  /**
   * The name of the Request Header that contains the version.
   */
  header: string;
}

export interface UriVersioningOptions {
  type: HttpVersioningType.URI;
  /**
   * Optional prefix that will prepend the version within the URI.
   *
   * Defaults to `v`.
   *
   * Ex. Assuming a version of `1`, for `/api/v1/route`, `v` is the prefix.
   */
  prefix?: string | false;
}

export interface MediaTypeVersioningOptions {
  type: HttpVersioningType.MEDIA_TYPE;
  /**
   * The key within the Media Type Header to determine the version from.
   *
   * Ex. For `application/json;v=1`, the key is `v=`.
   */
  key: string;
}

export interface CustomVersioningOptions {
  type: HttpVersioningType.CUSTOM;

  /**
   * A function that accepts a context and returns a single version value or
   * an ordered array of versions, in order from HIGHEST to LOWEST.
   *
   * Ex. Returned version array = ['3.1', '3.0', '2.5', '2', '1.9']
   *
   * Use type assertion or narrowing to identify the specific request type.
   */
  extractor: (context: unknown[]) => string | string[];
}

interface VersioningCommonOptions {
  /**
   * The default version to be used as a fallback when you did not provide some
   * version to `@Controller()` nor `@Version()`.
   */
  defaultVersion?: VersionOptions["version"];
}

export type VersioningOptions =
  & VersioningCommonOptions
  & (HeaderVersioningOptions | UriVersioningOptions | MediaTypeVersioningOptions | CustomVersioningOptions);
