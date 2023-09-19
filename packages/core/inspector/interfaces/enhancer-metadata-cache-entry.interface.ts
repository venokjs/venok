import { InstanceWrapper } from "@venok/core/injector/instance/wrapper";
import { EnhancerSubtype } from "@venok/core/constants";
import { Type } from "@venok/core/interfaces";

export interface EnhancerMetadataCacheEntry {
  targetNodeId?: string;
  moduleToken: string;
  classRef: Type;
  methodKey: string | undefined;
  enhancerRef?: unknown;
  enhancerInstanceWrapper?: InstanceWrapper;
  subtype: EnhancerSubtype;
}
