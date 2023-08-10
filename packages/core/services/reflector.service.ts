import { Type } from "@venok/core/interfaces";
import { isEmpty, isObject } from "@venok/core/utils/shared.utils";

type ClassOrFunction = Type | Function;

/**
 * Helper class providing Nest reflection capabilities.
 *
 * @publicApi
 */
export class Reflector {
  /**
   * Retrieve metadata for a specified key for a specified target.
   *
   * @example
   * `const roles = this.reflector.get<string[]>('roles', context.getHandler());`
   *
   * @param metadataKey lookup key for metadata to retrieve
   * @param target context (decorated object) to retrieve metadata from
   *
   */
  public get<TResult = any, TKey = any>(metadataKey: TKey, target: ClassOrFunction): TResult {
    return Reflect.getMetadata(metadataKey, target);
  }

  /**
   * Retrieve metadata for a specified key for a specified set of targets.
   *
   * @param metadataKey lookup key for metadata to retrieve
   * @param targets context (decorated objects) to retrieve metadata from
   *
   */
  public getAll<TResult extends any[] = any[], TKey = any>(metadataKey: TKey, targets: ClassOrFunction[]): TResult {
    return (targets || []).map((target) => this.get(metadataKey, target)) as TResult;
  }

  /**
   * Retrieve metadata for a specified key for a specified set of targets and merge results.
   *
   * @param metadataKey lookup key for metadata to retrieve
   * @param targets context (decorated objects) to retrieve metadata from
   *
   */
  public getAllAndMerge<TResult extends any[] = any[], TKey = any>(
    metadataKey: TKey,
    targets: ClassOrFunction[],
  ): TResult {
    const metadataCollection = this.getAll<TResult, TKey>(metadataKey, targets).filter((item) => item !== undefined);

    if (isEmpty(metadataCollection)) return metadataCollection as TResult;

    return metadataCollection.reduce((a, b) => {
      if (Array.isArray(a)) return a.concat(b);

      if (isObject(a) && isObject(b)) {
        return {
          ...a,
          ...b,
        };
      }
      return [a, b];
    });
  }

  /**
   * Retrieve metadata for a specified key for a specified set of targets and return a first not undefined value.
   *
   * @param metadataKey lookup key for metadata to retrieve
   * @param targets context (decorated objects) to retrieve metadata from
   *
   */
  public getAllAndOverride<TResult = any, TKey = any>(
    metadataKey: TKey,
    targets: ClassOrFunction[],
  ): TResult | undefined {
    for (const target of targets) {
      const result = this.get(metadataKey, target);
      if (result !== undefined) return result;
    }
    return undefined;
  }
}
