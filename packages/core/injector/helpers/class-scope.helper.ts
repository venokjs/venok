import { Scope, Type } from "@venok/core/interfaces";
import { SCOPE_OPTIONS_METADATA } from "@venok/core/constants";

export function getClassScope(provider: Type<unknown>): Scope {
  const metadata = Reflect.getMetadata(SCOPE_OPTIONS_METADATA, provider);
  return metadata && metadata.scope;
}
