import type { EnhancerMetadataCacheEntry, OrphanedEnhancerDefinition, Entrypoint } from "~/interfaces/index.js";

import { beforeEach, describe, expect, it, spyOn } from "bun:test";

import { VenokContainer } from "~/injector/container.js";
import { GraphInspector } from "~/inspector/graph-inspector.js";
import { SerializedGraph } from "~/inspector/serialized-graph.js";
import { Module } from "~/injector/module/module.js";
import { InstanceWrapper } from "~/injector/instance/wrapper.js";
import { Scope } from "~/enums/scope.enum.js";
import { UnknownDependenciesException } from "~/errors/exceptions/unknown-dependencies.exception.js";
import { PartialGraphHost } from "~/inspector/partial-graph.host.js";


describe("GraphInspector", () => {
  let graphInspector: GraphInspector;
  let enhancersMetadataCache: Array<EnhancerMetadataCacheEntry>;
  let graph: SerializedGraph;
  let container: VenokContainer;

  beforeEach(() => {
    container = new VenokContainer();
    graphInspector = new GraphInspector(container);

    enhancersMetadataCache = graphInspector["enhancersMetadataCache"];
    graph = graphInspector["graph"];
  });

  describe("insertEnhancerMetadataCache", () => {
    it("should insert an enhancer metadata cache entry", () => {
      const entry = {
        moduleToken: "moduleToken",
        classRef: class AppService {},
        methodKey: undefined,
        subtype: "guard" as const,
      };
      graphInspector.insertEnhancerMetadataCache(entry);
      expect(enhancersMetadataCache).toContain(entry);
    });
  });

  describe("inspectInstanceWrapper", () => {
    class AppService {}

    it("should inspect given instance wrapper and insert appropriate edges", () => {
      const moduleRef = new Module(class TestModule {}, container);
      const instanceWrapper = new InstanceWrapper({
        token: AppService,
        name: AppService.name,
        metatype: AppService,
      });

      const param1 = new InstanceWrapper({
        token: "PARAM_1",
        metatype: class A {},
        host: new Module(class AModule {}, container),
      });
      const param2 = new InstanceWrapper({
        token: "PARAM_2",
        metatype: class B {},
        host: new Module(class BModule {}, container),
      });
      const dependency = new InstanceWrapper({
        name: "PROPERTY",
        token: "PROPERTY",
        metatype: class C {},
        host: new Module(class CModule {}, container),
      });

      instanceWrapper.addCtorMetadata(0, param1);
      instanceWrapper.addCtorMetadata(1, param2);
      instanceWrapper.addCtorMetadata(2, dependency);

      graphInspector.inspectInstanceWrapper(instanceWrapper, moduleRef);

      const edgesArr = [...graph["edges"].values()];
      expect(edgesArr).toEqual([
        {
          id: edgesArr[0].id,
          metadata: {
            injectionType: "constructor",
            keyOrIndex: 0,
            sourceClassName: instanceWrapper.metatype!.name,
            sourceClassToken: instanceWrapper.token,
            sourceModuleName: "TestModule",
            targetClassName: param1.name,
            targetClassToken: "PARAM_1",
            targetModuleName: "AModule",
            type: "class-to-class",
          },
          source: instanceWrapper.id,
          target: param1.id,
        },
        {
          id: edgesArr[1].id,
          metadata: {
            injectionType: "constructor",
            keyOrIndex: 1,
            sourceClassName: instanceWrapper.metatype!.name,
            sourceClassToken: instanceWrapper.token,
            sourceModuleName: "TestModule",
            targetClassName: param2.name,
            targetClassToken: "PARAM_2",
            targetModuleName: "BModule",
            type: "class-to-class",
          },
          source: instanceWrapper.id,
          target: param2.id,
        },
        {
          id: edgesArr[2].id,
          metadata: {
            injectionType: "constructor",
            keyOrIndex: 2,
            sourceClassName: "AppService",
            sourceClassToken: AppService,
            sourceModuleName: "TestModule",
            targetClassName: dependency.name,
            targetClassToken: "PROPERTY",
            targetModuleName: "CModule",
            type: "class-to-class",
          },
          source: instanceWrapper.id,
          target: dependency.id,
        },
      ]);
    });
  });

  describe("inspectModules", () => {
    class TestModule {}
    class AController {}
    class RandomPipe {}

    it("should inspect all modules", async () => {
      const { moduleRef } = (await container.addModule(TestModule, []))!;
      
      // Добавляем провайдер
      moduleRef.addProvider(AController);

      const subtype = "interceptor";
      const enhancerInstanceWrapper = moduleRef.addInjectable(
        class Enhancer {},
        subtype
      ) as InstanceWrapper;

      const methodKey = "findOne";
      enhancersMetadataCache.push(
        {
          moduleToken: moduleRef.token,
          classRef: AController,
          enhancerRef: new RandomPipe(),
          methodKey,
          subtype,
        },
        {
          moduleToken: moduleRef.token,
          classRef: AController,
          enhancerRef: function test() {},
          methodKey,
          subtype,
        },
        {
          moduleToken: moduleRef.token,
          classRef: AController,
          enhancerInstanceWrapper,
          methodKey: undefined,
          subtype,
        }
      );

      const serializedNode = { metadata: {} };
      // @ts-expect-error Mismatch types
      const getNodeByIdSpy = spyOn(graph, "getNodeById").mockReturnValue(serializedNode);

      graphInspector.inspectModules();

      expect(getNodeByIdSpy).toHaveBeenCalled();
      expect(serializedNode).toEqual({
        metadata: {
          enhancers: [
            { methodKey, name: RandomPipe.name, subtype },
            { methodKey, name: "Function", subtype },
            { methodKey: undefined, id: enhancerInstanceWrapper.id, subtype },
          ],
        },
      });
    });
  });

  describe("insertAttachedEnhancer", () => {
    it('should upsert existing node (update metadata) and add node to "attachedEnhancers" array', () => {
      const instanceWrapper = new InstanceWrapper({
        metatype: class A {},
        token: "A",
      });

      const nodeDefinition = {
        id: instanceWrapper.id,
        label: "A",
        parent: "2c989d11-2731-4828-a2eb-c86d10c73621",
        metadata: {
          type: "provider" as const,
          sourceModuleName: "AppModule",
          durable: false,
          static: true,
          scope: Scope.DEFAULT,
          transient: false,
          token: class A {},
          exported: false,
          initTime: 100,
        },
      };
      const insertedNode = graph.insertNode(nodeDefinition)!;

      graphInspector.insertAttachedEnhancer(instanceWrapper);

      expect(insertedNode.metadata).toEqual({
        ...nodeDefinition.metadata,
        global: true,
      });
      expect(graph["extras"].attachedEnhancers).toContainEqual({
        nodeId: insertedNode.id,
      });
    });
  });

  describe("registerPartial", () => {
    it("should set graph status to partial and register with PartialGraphHost for UnknownDependenciesException", () => {
      const moduleRef = new Module(class TestModule {}, container);
      const exception = new UnknownDependenciesException(
        "TestToken",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        {} as any,
        moduleRef,
        { id: "test-node-id" }
      );

      const registerSpy = spyOn(PartialGraphHost, "register");

      graphInspector.registerPartial(exception);

      expect(graph["_status"]).toBe("partial");
      expect(graph["_metadata"]).toEqual({
        cause: {
          type: "unknown-dependencies",
          context: exception.context,
          moduleId: moduleRef.id,
          nodeId: "test-node-id",
        },
      });
      expect(registerSpy).toHaveBeenCalledWith(graph);
    });

    it("should set graph status to partial and register with PartialGraphHost for unknown error", () => {
      const unknownError = new Error("Unknown error");
      const registerSpy = spyOn(PartialGraphHost, "register");

      graphInspector.registerPartial(unknownError);

      expect(graph["_status"]).toBe("partial");
      expect(graph["_metadata"]).toEqual({
        cause: {
          type: "unknown",
          error: unknownError,
        },
      });
      expect(registerSpy).toHaveBeenCalledWith(graph);
    });
  });

  describe("inspectInstanceWrapper - property injection", () => {
    it("should handle property injection properly", () => {
      const moduleRef = new Module(class TestModule {}, container);
      const instanceWrapper = new InstanceWrapper({
        token: "AppService",
        name: "AppService",
        metatype: class AppService {},
      });

      const propertyDependency = new InstanceWrapper({
        name: "PropertyDep",
        token: "PropertyDep",
        metatype: class PropertyDep {},
        host: new Module(class PropertyModule {}, container),
      });

      instanceWrapper.addPropertiesMetadata("testProperty", propertyDependency);

      graphInspector.inspectInstanceWrapper(instanceWrapper, moduleRef);

      const edgesArr = [...graph["edges"].values()];
      expect(edgesArr).toHaveLength(1);
      // @ts-expect-error Mismatch types
      expect(edgesArr[0].metadata.injectionType).toBe("property");
      // @ts-expect-error Mismatch types
      expect(edgesArr[0].metadata.keyOrIndex).toBe("testProperty");
    });
  });

  describe("insertOrphanedEnhancer", () => {
    it("should insert orphaned enhancer with instance constructor name", () => {
      class TestEnhancer {}
      const instance = new TestEnhancer();
      const orphanedEnhancer: OrphanedEnhancerDefinition = {
        ref: instance,
        // @ts-expect-error Mismatch types
        methodKey: "testMethod",
        subtype: "guard",
      };

      const insertOrphanedEnhancerSpy = spyOn(graph, "insertOrphanedEnhancer");

      graphInspector.insertOrphanedEnhancer(orphanedEnhancer);

      expect(insertOrphanedEnhancerSpy).toHaveBeenCalledWith({
        ...orphanedEnhancer,
        ref: "TestEnhancer",
      });
    });

    it("should insert orphaned enhancer with Object fallback when ref has no constructor name", () => {
      const orphanedEnhancer: OrphanedEnhancerDefinition = {
        ref: {},
        // @ts-expect-error Mismatch types
        methodKey: "testMethod",
        subtype: "guard",
      };

      const insertOrphanedEnhancerSpy = spyOn(graph, "insertOrphanedEnhancer");

      graphInspector.insertOrphanedEnhancer(orphanedEnhancer);

      expect(insertOrphanedEnhancerSpy).toHaveBeenCalledWith({
        ...orphanedEnhancer,
        ref: "Object",
      });
    });

    it("should insert orphaned enhancer with Object fallback when ref is undefined", () => {
      const orphanedEnhancer: OrphanedEnhancerDefinition = {
        ref: undefined,
        // @ts-expect-error Mismatch types
        methodKey: "testMethod",
        subtype: "guard",
      };

      const insertOrphanedEnhancerSpy = spyOn(graph, "insertOrphanedEnhancer");

      graphInspector.insertOrphanedEnhancer(orphanedEnhancer);

      expect(insertOrphanedEnhancerSpy).toHaveBeenCalledWith({
        ...orphanedEnhancer,
        ref: "Object",
      });
    });
  });

  describe("insertEntrypointDefinition", () => {
    it("should insert entrypoint definition with generated id", () => {
      // @ts-expect-error Mismatch types
      const entrypoint: Entrypoint<any> = {
        classNodeId: "class-123",
        methodName: "handleRequest",
        type: "http",
      };

      const insertEntrypointSpy = spyOn(graph, "insertEntrypoint");

      graphInspector.insertEntrypointDefinition(entrypoint, "parent-123");

      expect(insertEntrypointSpy).toHaveBeenCalledWith(
        {
          ...entrypoint,
          id: "class-123_handleRequest",
        },
        "parent-123"
      );
    });

    it("should preserve existing id if present", () => {
      // @ts-expect-error Mismatch types
      const entrypoint: Entrypoint<any> = {
        id: "existing-id",
        classNodeId: "class-123",
        methodName: "handleRequest",
        type: "http",
      };

      const insertEntrypointSpy = spyOn(graph, "insertEntrypoint");

      graphInspector.insertEntrypointDefinition(entrypoint, "parent-123");

      expect(insertEntrypointSpy).toHaveBeenCalledWith(
        {
          ...entrypoint,
          id: "class-123_handleRequest",
        },
        "parent-123"
      );
    });
  });
});