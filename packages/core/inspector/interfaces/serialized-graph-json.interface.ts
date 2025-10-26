import type { Edge } from './edge.interface.js';
import type { Entrypoint } from './entrypoint.interface.js';
import type { Extras } from './extras.interface.js';
import type { Node } from './node.interface.js';
import type { SerializedGraphMetadata } from './serialized-graph-metadata.interface.js';

export type SerializedGraphStatus = "partial" | "complete";

export interface SerializedGraphJson {
  nodes: Record<string, Node>;
  edges: Record<string, Edge>;
  entrypoints: Record<string, Entrypoint<unknown>[]>;
  extras: Extras;
  status?: SerializedGraphStatus;
  metadata?: SerializedGraphMetadata;
}
