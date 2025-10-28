import type { InstanceWrapper } from "~/injector/instance/wrapper.js";
import type { EnhancerSubtype } from "~/constants.js";
import type { Type } from "~/interfaces/index.js";

export interface EnhancerMetadataCacheEntry {
  targetNodeId?: string;
  moduleToken: string;
  classRef: Type;
  methodKey: string | undefined;
  enhancerRef?: unknown;
  enhancerInstanceWrapper?: InstanceWrapper;
  subtype: EnhancerSubtype;
}
