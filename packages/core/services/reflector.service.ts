import { uid } from "uid";

import { type DecoratorsType, SetMetadata } from "@venok/core/decorators/index.js";
import { isEmpty, isObject } from "@venok/core/helpers/index.js";
import type { Type } from "@venok/core/interfaces/index.js";

interface DecoratorOptions<Options = any, Transformed = Options> {
  /**
   * The key for the metadata.
   * @default uid(21)
   */
  key?: string;

  /**
   * The transform function to apply to the metadata value.
   * @default value => value
   */
  transform?: (value: Options) => Transformed;
}

interface ClassDecoratorOptions<Options = any, Transformed = Options> extends DecoratorOptions<Options, Transformed> {
  type: "class";
}

interface MethodDecoratorOptions<Options = any, Transformed = Options> extends DecoratorOptions<Options, Transformed> {
  type: "method";
}

interface CreateDecoratorOptions<Options = any, Transformed = Options> extends DecoratorOptions<Options, Transformed> {
  /**
   * The decorator type (class or method)
   * @default class & method
   */
  type?: DecoratorsType;
}

type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

type WithTransform<T extends DecoratorOptions> = WithRequired<T, "transform">;

export type ReflectableDecorator<Options, Transformed = Options> = ((
  opts?: Options,
) => ClassDecorator & MethodDecorator) & {
  KEY: string;
};

export type ReflectableClassDecorator<Options, Transformed = Options> = ((opts?: Options) => ClassDecorator) & {
  KEY: string;
};

export type ReflectableMethodDecorator<Options, Transformed = Options> = ((opts?: Options) => MethodDecorator) & {
  KEY: string;
};

export type ReflectableDecorators<Options, Transformed = any> =
  | ReflectableDecorator<Options, Transformed>
  | ReflectableClassDecorator<Options, Transformed>
  | ReflectableMethodDecorator<Options, Transformed>;

/**
 * Helper class providing Venok reflection capabilities.
 *
 * @publicApi
 */
export class Reflector {
  static reflector = new Reflector();

  /**
   * Creates a decorator that can be used to decorate classes and methods with metadata.
   * Can be used as a strongly-typed alternative to `@SetMetadata`.
   * @param options Decorator options.
   * @returns A decorator function.
   */
  public static createDecorator<Options>(options?: DecoratorOptions<Options>): ReflectableDecorator<Options>;
  public static createDecorator<Options>(options?: ClassDecoratorOptions<Options>): ReflectableClassDecorator<Options>;
  public static createDecorator<Options>(
    options?: MethodDecoratorOptions<Options>,
  ): ReflectableMethodDecorator<Options>;
  public static createDecorator<Options, Transformed = Options>(
    options: WithTransform<DecoratorOptions<Options, Transformed>>,
  ): ReflectableDecorator<Options, Transformed>;
  public static createDecorator<Options, Transformed = Options>(
    options: WithTransform<ClassDecoratorOptions<Options, Transformed>>,
  ): ReflectableClassDecorator<Options, Transformed>;
  public static createDecorator<Options, Transformed = Options>(
    options: WithTransform<MethodDecoratorOptions<Options, Transformed>>,
  ): ReflectableMethodDecorator<Options, Transformed>;
  public static createDecorator<Options, Transformed = Options>(
    options: CreateDecoratorOptions<Options, Transformed> = {},
  ): ReflectableDecorators<Options, Transformed> {
    const metadataKey = options.key ?? uid(21);
    const decoratorFn =
      (metadataValue: Options) => (target: object | Function, key: string | symbol, descriptor?: any) => {
        const value = options.transform ? options.transform(metadataValue) : metadataValue;
        SetMetadata(metadataKey, value ?? undefined, options.type)(target, key, descriptor);
      };

    decoratorFn.KEY = metadataKey;

    return decoratorFn as ReflectableDecorators<Options, Transformed>;
  }

  /**
   * Creates a decorator with additional metadata that can be
   * used `(for internal use, like @Sse in Http etc.)`
   * to decorate classes and methods with metadata.
   * @param options Decorator options.
   * @returns A decorator function.
   */
  public static createMetadataDecorator<Options, Transformed extends Record<any, any>>(
    options: WithTransform<DecoratorOptions<Options, Transformed>>,
  ): ReflectableDecorator<Options, Transformed>;
  public static createMetadataDecorator<Options, Transformed extends Record<any, any>>(
    options: WithTransform<ClassDecoratorOptions<Options, Transformed>>,
  ): ReflectableClassDecorator<Options, Transformed>;
  public static createMetadataDecorator<Options, Transformed extends Record<any, any>>(
    options: WithTransform<MethodDecoratorOptions<Options, Transformed>>,
  ): ReflectableMethodDecorator<Options, Transformed>;
  public static createMetadataDecorator<Options, Transformed extends Record<any, any>>(
    options: WithTransform<CreateDecoratorOptions<Options, Transformed>>,
  ): ReflectableDecorators<Options, Transformed> {
    const metadataKey = options.key ?? uid(21);
    const decoratorFn =
      (metadataValue: Options) => (target: object | Function, key: string | symbol, descriptor?: any) => {
        const value = options.transform(metadataValue);

        for (const [additionalKey, additionalValue] of Object.entries(value)) {
          SetMetadata(additionalKey, additionalValue ?? undefined, options.type)(target, key, descriptor);
        }

        SetMetadata(metadataKey, true, options.type)(target, key, descriptor);
      };

    decoratorFn.KEY = metadataKey;
    return decoratorFn as ReflectableDecorators<Options, Transformed>;
  }

  constructor() {}

  /**
   * Check if metadata exist for a metadata decorator for a specified target.
   *
   * @example
   * `const roles = this.reflector.has(Roles, context.getHandler());`
   *
   * @param decorator reflectable decorator created through `Reflector.createDecorator`
   * @param target context (decorated object) to check metadata from
   *
   */
  public has<T extends ReflectableDecorators<any>>(decorator: T, target: Type | Function): boolean;
  /**
   * Check if metadata exist for a specified key for a specified target.
   *
   * @example
   * `const roles = this.reflector.has('roles', context.getHandler());`
   *
   * @param metadataKey lookup key for metadata to check
   * @param target context (decorated object) to check metadata from
   *
   */
  public has<TKey = any>(metadataKey: TKey, target: Type | Function): boolean;
  /**
   * Check if metadata exist for a specified key or metadata decorator for a specified target.
   *
   * @example
   * `const roles = this.reflector.has('roles', context.getHandler());`
   *
   * @param metadataKeyOrDecorator lookup key or decorator for metadata to check
   * @param target context (decorated object) to check metadata from
   *
   */
  public has<TKey = any>(metadataKeyOrDecorator: TKey, target: Type | Function): boolean {
    const metadataKey = (metadataKeyOrDecorator as ReflectableDecorators<unknown>).KEY ?? metadataKeyOrDecorator;

    return Reflect.hasMetadata(metadataKey, target);
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
  public get<T extends ReflectableDecorators<any>>(
    decorator: T,
    target: Type | Function,
  ): T extends ReflectableDecorators<any, infer R> ? R : unknown;
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
    const metadataKey = (metadataKeyOrDecorator as ReflectableDecorators<unknown>).KEY ?? metadataKeyOrDecorator;

    return Reflect.getMetadata(metadataKey, target);
  }

  /**
   * Retrieve metadata for a specified decorator for a specified set of targets.
   *
   * @param decorator lookup decorator for metadata to retrieve
   * @param targets context (decorated objects) to retrieve metadata from
   *
   */
  public getAll<T extends ReflectableDecorators<any>>(
    decorator: T,
    targets: (Type | Function)[],
  ): T extends ReflectableDecorators<infer R> ? (R extends Array<any> ? R : R[]) : unknown;
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
  public getAllAndMerge<T extends ReflectableDecorators<any>>(
    decorator: T,
    targets: (Type | Function)[],
  ): T extends ReflectableDecorators<infer R> ? R : unknown;
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
    const metadataCollection = this.getAll<any[], TKey>(metadataKeyOrDecorator, targets).filter(Boolean);

    if (isEmpty(metadataCollection)) return metadataCollection as TResult;

    return metadataCollection.reduce((a, b) => {
      if (Array.isArray(a)) return a.concat(b);

      if (isObject(a) && isObject(b)) return { ...a, ...b };

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
  public getAllAndOverride<T extends ReflectableDecorators<any>>(
    decorator: T,
    targets: (Type | Function)[],
  ): T extends ReflectableDecorators<infer R> ? R : unknown;
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
