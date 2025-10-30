import type { CustomDecorator, DecoratorsType, SetMetadataType } from "~/interfaces/index.js";

const defineMetadata = <K, V>(key: K, value: V, target: any) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  Reflect.defineMetadata(key, value, target);
  return target;
};

export const SetMetadata: SetMetadataType = <K = string, V = any>(
  metadataKey: K,
  metadataValue: V,
  type: DecoratorsType | undefined = undefined
): CustomDecorator<K> => {
  const decoratorFactory = (target: object | Function, key?: any, descriptor?: any) => {
    if (!type)
      return defineMetadata(metadataKey, metadataValue, descriptor && descriptor.value ? descriptor.value : target);

    return defineMetadata(metadataKey, metadataValue, type === "method" ? descriptor.value : target);
  };
  decoratorFactory.KEY = metadataKey;
  return decoratorFactory;
};
