type CustomClassDecorator = <TFunction extends Object | Function>(target: TFunction, ...args: any) => TFunction | void;

export type CustomDecorator<TKey = string> = MethodDecorator & CustomClassDecorator & { KEY: TKey };

export type DecoratorsType = "class" | "method";

type SetMetadata = {
  /**
   * Decorator that assigns metadata to the class using the specified `key`.
   *
   * Requires three parameters:
   * - `key` - a value defining the key under which the metadata is stored
   * - `value` - metadata to be associated with `key`
   * - `type` - decorator type (class)
   *
   * This metadata can be reflected using the `Reflector` class.
   *
   * Example: `@SetMetadata('roles', ['admin'], "class")`
   *
   * @publicApi
   */
  <K = string, V = any>(metadataKey: K, metadataValue: V, type: "class"): CustomClassDecorator & { KEY: K };
  /**
   * Decorator that assigns metadata to the method using the specified `key`.
   *
   * Requires three parameters:
   * - `key` - a value defining the key under which the metadata is stored
   * - `value` - metadata to be associated with `key`
   * - `type` - decorator type (method)
   *
   * This metadata can be reflected using the `Reflector` class.
   *
   * Example: `@SetMetadata('roles', ['admin'], "method")`
   *
   * @publicApi
   */
  <K = string, V = any>(metadataKey: K, metadataValue: V, type: "method"): MethodDecorator & { KEY: K };
  /**
   * Decorator that assigns metadata to the class/method using the specified `key`.
   *
   * Requires two parameters:
   * - `key` - a value defining the key under which the metadata is stored
   * - `value` - metadata to be associated with `key`
   *
   * This metadata can be reflected using the `Reflector` class.
   *
   * Example: `@SetMetadata('roles', ['admin'])`
   *
   * @publicApi
   */
  <K = string, V = any>(metadataKey: K, metadataValue: V, type?: DecoratorsType | undefined): CustomDecorator<K>;
};

const defineMetadata = <K, V>(key: K, value: V, target: any) => {
  Reflect.defineMetadata(key, value, target);
  return target;
};

export const SetMetadata: SetMetadata = <K = string, V = any>(
  metadataKey: K,
  metadataValue: V,
  type: DecoratorsType | undefined = undefined,
): CustomDecorator<K> => {
  const decoratorFactory = (target: object | Function, key?: any, descriptor?: any) => {
    if (!type) return defineMetadata(metadataKey, metadataValue, descriptor ? descriptor.value : target);

    return defineMetadata(metadataKey, metadataValue, type === "method" ? descriptor.value : target);
  };
  decoratorFactory.KEY = metadataKey;
  return decoratorFactory;
};
