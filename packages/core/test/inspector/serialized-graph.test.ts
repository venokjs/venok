import type { Edge, Node, Entrypoint, OrphanedEnhancerDefinition, SerializedGraphMetadata } from "~/interfaces/index.js";

import { beforeEach, describe, expect, it, spyOn } from "bun:test";

import { SerializedGraph } from "~/inspector/serialized-graph.js";
import { ApplicationConfig } from "~/application/config.js";
import { Scope } from "~/enums/scope.enum.js";
import { LazyModuleLoader } from "~/injector/module/lazy/loader.js";

describe("SerializedGraph", () => {
  let serializedGraph: SerializedGraph;
  let nodesCollection: Map<string, Node>;
  let edgesCollection: Map<string, Edge>;

  beforeEach(() => {
    serializedGraph = new SerializedGraph();
    nodesCollection = serializedGraph["nodes"];
    edgesCollection = serializedGraph["edges"];
  });

  describe("insertNode", () => {
    describe("when node definition represents an internal provider", () => {
      it("should insert a node with the expected schema (internal: true)", () => {
        const nodeDefinition = {
          id: "11430093-e992-4ae6-8ba4-c7db80419de8",
          label: "ApplicationConfig",
          parent: "2c989d11-2731-4828-a2eb-c86d10c73621",
          metadata: {
            type: "provider" as const,
            sourceModuleName: "AppModule",
            durable: false,
            static: true,
            transient: false,
            token: ApplicationConfig,
            scope: Scope.DEFAULT,
            exported: false,
            initTime: 100,
          },
        };
        serializedGraph.insertNode(nodeDefinition);

        expect(nodesCollection.get(nodeDefinition.id)).toEqual({
          ...nodeDefinition,
          metadata: {
            ...nodeDefinition.metadata,
            internal: true,
          },
        });
      });
    });
    describe("otherwise", () => {
      it("should insert a node with the expected schema", () => {
        class AppService {}

        const nodeDefinition = {
          id: "11430093-e992-4ae6-8ba4-c7db80419de8",
          label: "AppService",
          parent: "2c989d11-2731-4828-a2eb-c86d10c73621",
          metadata: {
            type: "provider" as const,
            sourceModuleName: "AppModule",
            durable: false,
            static: true,
            transient: false,
            token: AppService,
            scope: Scope.DEFAULT,
            exported: false,
            initTime: 100,
          },
        };
        serializedGraph.insertNode(nodeDefinition);

        expect(nodesCollection.get(nodeDefinition.id)).toBe(nodeDefinition);
      });
    });
  });

  describe("insertEdge", () => {
    describe("when edge definition represents internal providers connection", () => {
      it("should insert an edge with the expected schema (internal: true)", () => {
        const edgeDefinition = {
          source: "8920252f-4e7d-4f9e-9eeb-71da467a35cc",
          target: "c97bc04d-cfcf-41b1-96ec-db729f33676e",
          metadata: {
            type: "class-to-class" as const,
            sourceModuleName: "UtilsExceptionsModule",
            sourceClassName: "AllExceptionsFilter",
            targetClassName: "LazyModuleLoader",
            sourceClassToken: "APP_FILTER (UUID: 4187828c-5c76-4aed-a29f-a6eb40054b9d)",
            targetClassToken: LazyModuleLoader,
            targetModuleName: "InternalCoreModule",
            keyOrIndex: 0,
            injectionType: "constructor" as const,
          },
        };
        const edge = serializedGraph.insertEdge(edgeDefinition);

        expect(edgesCollection.get(edge.id)).toEqual({
          ...edgeDefinition,
          metadata: {
            ...edgeDefinition.metadata,
            internal: true,
          },
          id: edge.id,
        });
      });
    });
    describe("otherwise", () => {
      it("should insert an edge with the expected schema", () => {
        const edgeDefinition = {
          source: "8920252f-4e7d-4f9e-9eeb-71da467a35cc",
          target: "c97bc04d-cfcf-41b1-96ec-db729f33676e",
          metadata: {
            type: "class-to-class" as const,
            sourceModuleName: "UtilsExceptionsModule",
            sourceClassName: "AllExceptionsFilter",
            targetClassName: "AppService",
            sourceClassToken:
              "APP_FILTER (UUID: 4187828c-5c76-4aed-a29f-a6eb40054b9d)",
            targetClassToken: "AppService",
            targetModuleName: "InternalCoreModule",
            keyOrIndex: 0,
            injectionType: "constructor" as const,
          },
        };
        const edge = serializedGraph.insertEdge(edgeDefinition);

        expect(edgesCollection.get(edge.id)).toEqual({
          ...edgeDefinition,
          id: edge.id,
        });
      });
    });
  });

  describe("getNodeById", () => {
    it("should return a given node", () => {
      const nodeDefinition = {
        id: "11430093-e992-4ae6-8ba4-c7db80419de8",
        label: "AppService",
        parent: "2c989d11-2731-4828-a2eb-c86d10c73621",
        metadata: {
          type: "provider" as const,
          sourceModuleName: "AppModule",
          durable: false,
          static: true,
          transient: false,
          scope: Scope.DEFAULT,
          token: "AppService",
          exported: true,
          initTime: 100,
        },
      };

      nodesCollection.set(nodeDefinition.id, nodeDefinition);
      expect(serializedGraph.getNodeById(nodeDefinition.id)).toBe(
        nodeDefinition
      );
    });
  });

  describe("insertNode", () => {
    describe("when node already exists", () => {
      it("should return the existing node", () => {
        const nodeDefinition = {
          id: "existing-node-id",
          label: "ExistingService",
          parent: "parent-id",
          metadata: {
            type: "provider" as const,
            sourceModuleName: "AppModule",
            durable: false,
            static: true,
            transient: false,
            token: "ExistingService",
            scope: Scope.DEFAULT,
            exported: false,
            initTime: 100,
          },
        };

        // Insert node first time
        const firstResult = serializedGraph.insertNode(nodeDefinition);
        
        // Insert same node again
        const secondResult = serializedGraph.insertNode(nodeDefinition);
        
        expect(firstResult).toBe(secondResult);
        expect(secondResult).toBe(nodesCollection.get(nodeDefinition.id));
      });
    });
  });

  describe("insertEntrypoint", () => {
    it("should insert entrypoint for new parent", () => {
      const parentId = "parent-123";
      const entrypoint: Entrypoint<{ key: string }> = {
        id: "entry-1",
        type: "controller",
        methodName: "create",
        className: "UserController",
        classNodeId: "node-123",
        metadata: { key: "value" },
      };

      serializedGraph.insertEntrypoint(entrypoint, parentId);
      
      const entrypoints = serializedGraph["entrypoints"];
      expect(entrypoints.get(parentId)).toEqual([entrypoint]);
    });

    it("should append entrypoint to existing parent collection", () => {
      const parentId = "parent-456";
      const firstEntrypoint: Entrypoint<{ key: string }> = {
        id: "entry-1",
        type: "controller",
        methodName: "create",
        className: "UserController",
        classNodeId: "node-123",
        metadata: { key: "value1" },
      };
      const secondEntrypoint: Entrypoint<{ key: string }> = {
        id: "entry-2",
        type: "controller",
        methodName: "update",
        className: "UserController",
        classNodeId: "node-123",
        metadata: { key: "value2" },
      };

      serializedGraph.insertEntrypoint(firstEntrypoint, parentId);
      serializedGraph.insertEntrypoint(secondEntrypoint, parentId);
      
      const entrypoints = serializedGraph["entrypoints"];
      expect(entrypoints.get(parentId)).toEqual([firstEntrypoint, secondEntrypoint]);
    });
  });

  describe("insertOrphanedEnhancer", () => {
    it("should add orphaned enhancer to extras", () => {
      const enhancer: OrphanedEnhancerDefinition = {
        subtype: "guard",
        ref: class AuthGuard {},
      };

      serializedGraph.insertOrphanedEnhancer(enhancer);
      
      const extras = serializedGraph["extras"];
      expect(extras.orphanedEnhancers).toContain(enhancer);
    });
  });

  describe("insertAttachedEnhancer", () => {
    it("should add attached enhancer to extras", () => {
      const nodeId = "enhancer-node-123";

      serializedGraph.insertAttachedEnhancer(nodeId);
      
      const extras = serializedGraph["extras"];
      expect(extras.attachedEnhancers).toContainEqual({ nodeId });
    });
  });

  describe("status setter", () => {
    it("should set the status", () => {
      serializedGraph.status = "partial";
      expect(serializedGraph["_status"]).toBe("partial");
    });
  });

  describe("metadata setter", () => {
    it("should set the metadata", () => {
      const metadata: SerializedGraphMetadata = {
        cause: {
          type: "unknown-dependencies",
          context: { index: 0, dependencies: [] },
          moduleId: "module-123",
          nodeId: "node-456",
          error: new Error("Test error"),
        },
      };

      serializedGraph.metadata = metadata;
      expect(serializedGraph["_metadata"]).toBe(metadata);
    });
  });

  describe("toJSON", () => {
    it("should return JSON representation without status and metadata", () => {
      const nodeDefinition = {
        id: "node-1",
        label: "TestService",
        parent: "parent-1",
        metadata: {
          type: "provider" as const,
          sourceModuleName: "TestModule",
          durable: false,
          static: true,
          transient: false,
          token: "TestService",
          scope: Scope.DEFAULT,
          exported: false,
          initTime: 100,
        },
      };

      const edgeDefinition = {
        source: "source-1",
        target: "target-1",
        metadata: {
          type: "class-to-class" as const,
          sourceModuleName: "SourceModule",
          sourceClassName: "SourceClass",
          targetClassName: "TargetClass",
          sourceClassToken: "SourceToken",
          targetClassToken: "TargetToken",
          targetModuleName: "TargetModule",
          keyOrIndex: 0,
          injectionType: "constructor" as const,
        },
      };

      serializedGraph.insertNode(nodeDefinition);
      const edge = serializedGraph.insertEdge(edgeDefinition);

      const json = serializedGraph.toJSON();

      expect(json.nodes).toEqual({ [nodeDefinition.id]: nodeDefinition });
      expect(json.edges).toEqual({ [edge.id]: edge });
      expect(json.entrypoints).toEqual({});
      expect(json.extras).toEqual({
        orphanedEnhancers: [],
        attachedEnhancers: [],
      });
      expect(json.status).toBe("complete");
      expect(json.metadata).toBeUndefined();
    });

    it("should include status and metadata when set", () => {
      const metadata: SerializedGraphMetadata = {
        cause: {
          type: "unknown",
          error: "Test error",
        },
      };

      serializedGraph.status = "partial";
      serializedGraph.metadata = metadata;

      const json = serializedGraph.toJSON();

      expect(json.status).toBe("partial");
      expect(json.metadata).toEqual(metadata);
    });
  });

  describe("toString", () => {
    it("should return stringified JSON with proper replacer for symbols and functions", () => {
      const symbolToken = Symbol("TestSymbol");
      const functionToken = function namedFunction() {};
      const anonymousFunction = () => {};

      const nodeWithSymbol = {
        id: "symbol-node",
        label: "SymbolNode",
        parent: "parent-1",
        metadata: {
          type: "provider" as const,
          sourceModuleName: "TestModule",
          durable: false,
          static: true,
          transient: false,
          token: symbolToken,
          scope: Scope.DEFAULT,
          exported: false,
          initTime: 100,
        },
      };

      const nodeWithFunction = {
        id: "function-node",
        label: "FunctionNode",
        parent: "parent-1",
        metadata: {
          type: "provider" as const,
          sourceModuleName: "TestModule",
          durable: false,
          static: true,
          transient: false,
          token: functionToken,
          scope: Scope.DEFAULT,
          exported: false,
          initTime: 100,
        },
      };

      const nodeWithAnonymousFunction = {
        id: "anon-function-node",
        label: "AnonFunctionNode",
        parent: "parent-1",
        metadata: {
          type: "provider" as const,
          sourceModuleName: "TestModule",
          durable: false,
          static: true,
          transient: false,
          token: anonymousFunction,
          scope: Scope.DEFAULT,
          exported: false,
          initTime: 100,
        },
      };

      serializedGraph.insertNode(nodeWithSymbol);
      serializedGraph.insertNode(nodeWithFunction);
      serializedGraph.insertNode(nodeWithAnonymousFunction);

      const result = serializedGraph.toString();

      expect(result).toContain(symbolToken.toString());
      expect(result).toContain("namedFunction");
      expect(result).toContain("Function");
      expect(typeof result).toBe("string");
      
      // Verify it's valid JSON
      expect(() => JSON.parse(result)).not.toThrow();
    });
  });
});