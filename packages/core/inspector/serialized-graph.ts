import { SerializedGraphMetadata } from "@venok/core/inspector/interfaces/serialized-graph-metadata.interface";
import { Edge } from "@venok/core/inspector/interfaces/edge.interface";
import { Entrypoint } from "@venok/core/inspector/interfaces/entrypoint.interface";
import { Extras, OrphanedEnhancerDefinition } from "@venok/core/inspector/interfaces/extras.interface";
import { InjectionToken } from "@venok/core/interfaces/modules";
import { ApplicationConfig } from "@venok/core/application-config";
import { Ref } from "@venok/core/injector/module/ref";
import { LazyModuleLoader } from "@venok/core/injector/module/lazy/loader";
import { ModulesContainer } from "@venok/core/injector/module/container";
import { Reflector } from "@venok/core/services";
import { INQUIRER, REQUEST } from "@venok/core/constants";
import { Node } from "@venok/core/inspector/interfaces/node.interface";
import { SerializedGraphJson } from "@venok/core/inspector/interfaces/serialized-graph-json.interface";
import { DeterministicUuidRegistry } from "@venok/core/helpers/uuid.helper";

export type SerializedGraphStatus = "partial" | "complete";
type WithOptionalId<T extends Record<"id", string>> = Omit<T, "id"> & Partial<Pick<T, "id">>;

export class SerializedGraph {
  private readonly nodes = new Map<string, Node>();
  private readonly edges = new Map<string, Edge>();
  private readonly entrypoints = new Map<string, Entrypoint<unknown>[]>();
  private readonly extras: Extras = {
    orphanedEnhancers: [],
    attachedEnhancers: [],
  };
  private _status: SerializedGraphStatus = "complete";
  private _metadata?: SerializedGraphMetadata;

  private static readonly INTERNAL_PROVIDERS: Array<InjectionToken> = [
    ApplicationConfig,
    Ref,
    // HttpAdapterHost,
    LazyModuleLoader,
    // ExternalContextCreator,
    ModulesContainer,
    Reflector,
    SerializedGraph,
    // HttpAdapterHost.name,
    Reflector.name,
    REQUEST,
    INQUIRER,
  ];

  set status(status: SerializedGraphStatus) {
    this._status = status;
  }

  set metadata(metadata: SerializedGraphMetadata) {
    this._metadata = metadata;
  }

  public insertNode(nodeDefinition: Node) {
    if (
      nodeDefinition.metadata.type === "provider" &&
      SerializedGraph.INTERNAL_PROVIDERS.includes(nodeDefinition.metadata.token)
    ) {
      nodeDefinition.metadata = {
        ...nodeDefinition.metadata,
        internal: true,
      };
    }
    if (this.nodes.has(nodeDefinition.id)) {
      return this.nodes.get(nodeDefinition.id);
    }
    this.nodes.set(nodeDefinition.id, nodeDefinition);
    return nodeDefinition;
  }

  public insertEdge(edgeDefinition: WithOptionalId<Edge>) {
    if (
      edgeDefinition.metadata.type === "class-to-class" &&
      (SerializedGraph.INTERNAL_PROVIDERS.includes(edgeDefinition.metadata.sourceClassToken) ||
        SerializedGraph.INTERNAL_PROVIDERS.includes(edgeDefinition.metadata.targetClassToken))
    ) {
      edgeDefinition.metadata = {
        ...edgeDefinition.metadata,
        internal: true,
      };
    }
    const id = edgeDefinition.id ?? this.generateUuidByEdgeDefinition(edgeDefinition);
    const edge = {
      ...edgeDefinition,
      id,
    };
    this.edges.set(id, edge);
    return edge;
  }

  public insertEntrypoint<T>(definition: Entrypoint<T>, parentId: string) {
    if (this.entrypoints.has(parentId)) {
      const existingCollection = this.entrypoints.get(parentId) as Entrypoint<any>[];
      existingCollection.push(definition);
    } else {
      this.entrypoints.set(parentId, [definition]);
    }
  }

  public insertOrphanedEnhancer(entry: OrphanedEnhancerDefinition) {
    this.extras.orphanedEnhancers.push(entry);
  }

  public insertAttachedEnhancer(nodeId: string) {
    this.extras.attachedEnhancers.push({
      nodeId,
    });
  }

  public getNodeById(id: string) {
    return this.nodes.get(id);
  }

  public toJSON(): SerializedGraphJson {
    const json: SerializedGraphJson = {
      nodes: Object.fromEntries(this.nodes),
      edges: Object.fromEntries(this.edges),
      entrypoints: Object.fromEntries(this.entrypoints),
      extras: this.extras,
    };

    if (this._status) {
      json["status"] = this._status;
    }
    if (this._metadata) {
      json["metadata"] = this._metadata;
    }
    return json;
  }

  public toString() {
    const replacer = (key: string, value: unknown) => {
      if (typeof value === "symbol") {
        return value.toString();
      }
      return typeof value === "function" ? value.name ?? "Function" : value;
    };
    return JSON.stringify(this.toJSON(), replacer, 2);
  }

  private generateUuidByEdgeDefinition(edgeDefinition: WithOptionalId<Edge>): string {
    return DeterministicUuidRegistry.get(JSON.stringify(edgeDefinition));
  }
}
