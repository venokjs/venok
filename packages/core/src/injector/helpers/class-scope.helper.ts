import type { Type } from "~/interfaces/index.js";
import { SCOPE_OPTIONS_METADATA } from "~/constants.js";
import { Scope } from "~/enums/scope.enum.js";

export function getClassScope(provider: Type): Scope {
  const metadata = Reflect.getMetadata(SCOPE_OPTIONS_METADATA, provider);
  return metadata && metadata.scope;
}
