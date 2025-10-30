import type { SerializedGraphMetadata } from "~/interfaces/inspector/serialized-graph-metadata.interface.js";
import type { Entrypoint } from "~/interfaces/inspector/entrypoint.interface.js";
import type { Extras } from "~/interfaces/inspector/extras.interface.js";
import type { Edge } from "~/interfaces/inspector/edge.interface.js";
import type { Node } from "~/interfaces/inspector/node.interface.js";

export type SerializedGraphStatus = "partial" | "complete";

export interface SerializedGraphJson {
  nodes: Record<string, Node>;
  edges: Record<string, Edge>;
  entrypoints: Record<string, Entrypoint<unknown>[]>;
  extras: Extras;
  status?: SerializedGraphStatus;
  metadata?: SerializedGraphMetadata;
}
