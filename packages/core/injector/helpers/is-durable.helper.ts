import { SCOPE_OPTIONS_METADATA, type Type } from "@venok/core";

export function isDurable(provider: Type): boolean | undefined {
  const metadata = Reflect.getMetadata(SCOPE_OPTIONS_METADATA, provider);
  return metadata && metadata.durable;
}
