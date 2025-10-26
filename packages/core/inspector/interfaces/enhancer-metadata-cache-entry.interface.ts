import { InstanceWrapper } from "@venok/core/injector/instance/wrapper.js";
import type { EnhancerSubtype } from "@venok/core/constants.js";
import type { Type } from "@venok/core/interfaces/index.js";

export interface EnhancerMetadataCacheEntry {
  targetNodeId?: string;
  moduleToken: string;
  classRef: Type;
  methodKey: string | undefined;
  enhancerRef?: unknown;
  enhancerInstanceWrapper?: InstanceWrapper;
  subtype: EnhancerSubtype;
}
