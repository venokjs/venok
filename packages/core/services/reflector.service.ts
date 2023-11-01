import { CustomDecorator, DecoratorsType, SetMetadata } from "@venok/core/decorators/set-metadata.decorator";
import { uid } from "uid";
import { Type } from "@venok/core/interfaces";
import { isEmpty, isObject } from "@venok/core/helpers/shared.helper";
import { Logger } from "@venok/core/services/logger.service";

/**
 * @publicApi
 */
export interface CreateDecoratorOptions<TParam = any, TTransformed = TParam> {
  /**
   * The key for the metadata.
   * @default uid(21)
   */
  key?: string;

  /**
   * The decorator type (class or method)
   * @default class & method
   */
  type?: DecoratorsType;

  /**
   * The transform function to apply to the metadata value.
   * @default value => value
   */
  transform?: (value: TParam) => TTransformed;
}

type CreateDecoratorWithTransformOptions<TParam, TTransformed = TParam> = CreateDecoratorOptions<TParam, TTransformed> &
  Required<Pick<CreateDecoratorOptions<TParam, TTransformed>, "transform">>;

/**
 * @publicApi
 */
export type ReflectableDecorator<TParam, TTransformed = TParam> = ((opts?: TParam) => CustomDecorator) & {
  KEY: string;
};

/**
 * Helper class providing Venok reflection capabilities.
 *
 * @publicApi
 */
export class Reflector {
  private static readonly logger = new Logger(Reflector.name, {
    timestamp: true,
  });

  /**
   * Creates a decorator that can be used to decorate classes and methods with metadata.
   * Can be used as a strongly-typed alternative to `@SetMetadata`.
   * @param options Decorator options.
   * @returns A decorator function.
   */
  static createDecorator<TParam>(options?: CreateDecoratorOptions<TParam>): ReflectableDecorator<TParam>;
  static createDecorator<TParam, TTransformed>(
    options: CreateDecoratorWithTransformOptions<TParam, TTransformed>,
  ): ReflectableDecorator<TParam, TTransformed>;
  static createDecorator<TParam, TTransformed = TParam>(
    options: CreateDecoratorOptions<TParam, TTransformed> = {},
  ): ReflectableDecorator<TParam, TTransformed> {
    const metadataKey = options.key ?? uid(21);
    const decoratorFn =
      (metadataValue: TParam) => (target: object | Function, key: string | symbol, descriptor?: any) => {
        const value = options.transform ? options.transform(metadataValue) : metadataValue;
        if (Array.isArray(value) && Array.isArray(value[0])) {
          const allMetadata = value.filter(Reflector.checkMetadata);
          for (const [metaKey, metaValue] of allMetadata) {
            SetMetadata(metaKey, metaValue ?? undefined, options.type)(target, key, descriptor);
          }
        } else SetMetadata(metadataKey, value ?? undefined, options.type)(target, key, descriptor);
      };

    decoratorFn.KEY = metadataKey;
    return decoratorFn as ReflectableDecorator<TParam, TTransformed>;
  }

  private static checkMetadata(item: [string, any] | any): boolean {
    if (!Array.isArray(item)) {
      Reflector.logger.warn(`For apply metadata you need to provide key and value. Metadata: ${item}`);
      return false;
    }
    return true;
  }

  /**
   * Retrieve metadata for a reflectable decorator for a specified target.
   *
   * @example
   * `const roles = this.reflector.get(Roles, context.getHandler());`
   *
   * @param decorator reflectable decorator created through `Reflector.createDecorator`
   * @param target context (decorated object) to retrieve metadata from
   *
   */
  public get<T extends ReflectableDecorator<any>>(
    decorator: T,
    target: Type | Function,
  ): T extends ReflectableDecorator<any, infer R> ? R : unknown;
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
  public get<TResult = any, TKey = any>(metadataKey: TKey, target: Type | Function): TResult;
  /**
   * Retrieve metadata for a specified key or decorator for a specified target.
   *
   * @example
   * `const roles = this.reflector.get<string[]>('roles', context.getHandler());`
   *
   * @param metadataKeyOrDecorator lookup key or decorator for metadata to retrieve
   * @param target context (decorated object) to retrieve metadata from
   *
   */
  public get<TResult = any, TKey = any>(metadataKeyOrDecorator: TKey, target: Type | Function): TResult {
    const metadataKey = (metadataKeyOrDecorator as ReflectableDecorator<unknown>).KEY ?? metadataKeyOrDecorator;

    return Reflect.getMetadata(metadataKey, target);
  }

  /**
   * Retrieve metadata for a specified decorator for a specified set of targets.
   *
   * @param decorator lookup decorator for metadata to retrieve
   * @param targets context (decorated objects) to retrieve metadata from
   *
   */
  public getAll<T extends ReflectableDecorator<any>>(
    decorator: T,
    targets: (Type | Function)[],
  ): T extends ReflectableDecorator<infer R> ? (R extends Array<any> ? R : R[]) : unknown;
  /**
   * Retrieve metadata for a specified key for a specified set of targets.
   *
   * @param metadataKey lookup key for metadata to retrieve
   * @param targets context (decorated objects) to retrieve metadata from
   *
   */
  public getAll<TResult extends any[] = any[], TKey = any>(metadataKey: TKey, targets: (Type | Function)[]): TResult;
  /**
   * Retrieve metadata for a specified key or decorator for a specified set of targets.
   *
   * @param metadataKeyOrDecorator lookup key or decorator for metadata to retrieve
   * @param targets context (decorated objects) to retrieve metadata from
   *
   */
  public getAll<TResult extends any[] = any[], TKey = any>(
    metadataKeyOrDecorator: TKey,
    targets: (Type | Function)[],
  ): TResult {
    return (targets || []).map((target) => this.get(metadataKeyOrDecorator, target)) as TResult;
  }

  /**
   * Retrieve metadata for a specified decorator for a specified set of targets and merge results.
   *
   * @param decorator lookup decorator for metadata to retrieve
   * @param targets context (decorated objects) to retrieve metadata from
   *
   */
  public getAllAndMerge<T extends ReflectableDecorator<any>>(
    decorator: T,
    targets: (Type | Function)[],
  ): T extends ReflectableDecorator<infer R> ? R : unknown;
  /**
   * Retrieve metadata for a specified key for a specified set of targets and merge results.
   *
   * @param metadataKey lookup key for metadata to retrieve
   * @param targets context (decorated objects) to retrieve metadata from
   *
   */
  public getAllAndMerge<TResult extends any[] | object = any[], TKey = any>(
    metadataKey: TKey,
    targets: (Type | Function)[],
  ): TResult;
  /**
   * Retrieve metadata for a specified key or decorator for a specified set of targets and merge results.
   *
   * @param metadataKeyOrDecorator lookup key for metadata to retrieve
   * @param targets context (decorated objects) to retrieve metadata from
   *
   */
  public getAllAndMerge<TResult extends any[] | object = any[], TKey = any>(
    metadataKeyOrDecorator: TKey,
    targets: (Type | Function)[],
  ): TResult {
    const metadataCollection = this.getAll<any[], TKey>(metadataKeyOrDecorator, targets).filter(
      (item) => item !== undefined,
    );

    if (isEmpty(metadataCollection)) {
      return metadataCollection as TResult;
    }
    return metadataCollection.reduce((a, b) => {
      if (Array.isArray(a)) {
        return a.concat(b);
      }
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
   * Retrieve metadata for a specified decorator for a specified set of targets and return a first not undefined value.
   *
   * @param decorator lookup decorator for metadata to retrieve
   * @param targets context (decorated objects) to retrieve metadata from
   *
   */
  public getAllAndOverride<T extends ReflectableDecorator<any>>(
    decorator: T,
    targets: (Type | Function)[],
  ): T extends ReflectableDecorator<infer R> ? R : unknown;
  /**
   * Retrieve metadata for a specified key for a specified set of targets and return a first not undefined value.
   *
   * @param metadataKey lookup key for metadata to retrieve
   * @param targets context (decorated objects) to retrieve metadata from
   *
   */
  public getAllAndOverride<TResult = any, TKey = any>(metadataKey: TKey, targets: (Type | Function)[]): TResult;
  /**
   * Retrieve metadata for a specified key or decorator for a specified set of targets and return a first not undefined value.
   *
   * @param metadataKeyOrDecorator lookup key or metadata for metadata to retrieve
   * @param targets context (decorated objects) to retrieve metadata from
   *
   */
  public getAllAndOverride<TResult = any, TKey = any>(
    metadataKeyOrDecorator: TKey,
    targets: (Type | Function)[],
  ): TResult | undefined {
    for (const target of targets) {
      const result = this.get(metadataKeyOrDecorator, target);
      if (result !== undefined) return result;
    }
    return undefined;
  }
}
