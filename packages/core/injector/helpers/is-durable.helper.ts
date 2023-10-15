import { SCOPE_OPTIONS_METADATA } from "@venok/core/constants";
import { Type } from "@venok/core/interfaces";

export function isDurable(provider: Type): boolean | undefined {
  const metadata = Reflect.getMetadata(SCOPE_OPTIONS_METADATA, provider);
  return metadata && metadata.durable;
}
