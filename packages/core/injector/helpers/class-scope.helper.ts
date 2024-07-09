import { Scope, SCOPE_OPTIONS_METADATA, Type } from "@venok/core";

export function getClassScope(provider: Type): Scope {
  const metadata = Reflect.getMetadata(SCOPE_OPTIONS_METADATA, provider);
  return metadata && metadata.scope;
}
