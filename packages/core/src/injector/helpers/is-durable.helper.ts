import type { Type } from "~/interfaces/index.js";

import { SCOPE_OPTIONS_METADATA } from "~/constants.js";

export function isDurable(provider: Type): boolean | undefined {
  const metadata = Reflect.getMetadata(SCOPE_OPTIONS_METADATA, provider);
  return metadata && metadata.durable;
}
