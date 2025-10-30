// eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
type CustomClassDecorator = <TFunction extends Object | Function>(target: TFunction, ...args: any) => TFunction | void;
export type CustomDecorator<TKey = string> = MethodDecorator & CustomClassDecorator & { KEY: TKey };
export type DecoratorsType = "class" | "method";
export type SetMetadataType = {
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
  <K = string, V = any>(metadataKey: K, metadataValue: V, type?: DecoratorsType): CustomDecorator<K>;
};
