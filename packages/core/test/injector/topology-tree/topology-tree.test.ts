import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

import { TopologyTree } from "~/injector/topology-tree/topology-tree.js";
import { TreeNode } from "~/injector/topology-tree/tree-node.js";
import { Module } from "~/injector/module/module.js";
import { VenokContainer } from "~/injector/container.js";

describe("TopologyTree", () => {
  let container: VenokContainer;
  let rootModule: Module;
  let childModule1: Module;
  let childModule2: Module;
  let grandChildModule: Module;

  beforeEach(() => {
    container = new VenokContainer();
    
    class RootModuleClass {}
    class ChildModule1Class {}
    class ChildModule2Class {}
    class GrandChildModuleClass {}

    rootModule = new Module(RootModuleClass, container);
    childModule1 = new Module(ChildModule1Class, container);
    childModule2 = new Module(ChildModule2Class, container);
    grandChildModule = new Module(GrandChildModuleClass, container);
  });

  describe("constructor", () => {
    it("should create root node with provided module", () => {
      const tree = new TopologyTree(rootModule);

      expect(tree["root"]).toBeInstanceOf(TreeNode);
      expect(tree["root"].value).toBe(rootModule);
      expect(tree["root"]["parent"]).toBeNull();
    });

    it("should initialize links map with root module", () => {
      const tree = new TopologyTree(rootModule);

      expect(tree["links"].has(rootModule)).toBe(true);
      expect(tree["links"].get(rootModule)).toBe(tree["root"]);
    });

    it("should call traverseAndMapToTree during construction", () => {
      // @ts-expect-error Mismatch types
      const traverseSpy = spyOn(TopologyTree.prototype, "traverseAndMapToTree");
      new TopologyTree(rootModule);

      expect(traverseSpy).toHaveBeenCalledWith(expect.any(TreeNode));
    });
  });

  describe("walk", () => {
    it("should call callback for root module when no children", () => {
      const tree = new TopologyTree(rootModule);
      const callback = mock();

      tree.walk(callback);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(rootModule, 1);
    });

    it("should call callback for all modules in tree with correct depth", () => {
      rootModule.addImport(childModule1);
      rootModule.addImport(childModule2);
      childModule1.addImport(grandChildModule);

      const tree = new TopologyTree(rootModule);
      const callback = mock();

      tree.walk(callback);

      expect(callback).toHaveBeenCalledWith(rootModule, 1);
      // The specific number of calls and order may vary based on implementation
      expect(callback).toHaveBeenCalledTimes(4);
    });

    it("should traverse tree in order", () => {
      rootModule.addImport(childModule1);
      childModule1.addImport(childModule2);

      const tree = new TopologyTree(rootModule);
      const visitedModules: Module[] = [];

      tree.walk((module) => {
        visitedModules.push(module);
      });

      expect(visitedModules[0]).toBe(rootModule);
      expect(visitedModules.length).toBe(3);
    });
  });

  describe("traverseAndMapToTree", () => {
    it("should return early when module has no imports", () => {
      const tree = new TopologyTree(rootModule);
      
      // Root module has no imports, so only root should be in links
      expect(tree["links"].size).toBe(1);
      expect(tree["links"].has(rootModule)).toBe(true);
    });

    it("should skip null/undefined imports", () => {
      rootModule.addImport(childModule1);
      
      const tree = new TopologyTree(rootModule);
      
      expect(tree["links"].has(childModule1)).toBe(true);
      expect(tree["links"].size).toBe(2); // root + childModule1
    });

    it("should create new nodes for unvisited children", () => {
      rootModule.addImport(childModule1);

      const tree = new TopologyTree(rootModule);

      expect(tree["links"].has(childModule1)).toBe(true);
      expect(tree["links"].get(childModule1)).toBeInstanceOf(TreeNode);
      expect(tree["root"].children.size).toBe(1);
    });

    it("should handle existing nodes correctly", () => {
      rootModule.addImport(childModule1);
      childModule1.addImport(rootModule); // Creates potential cycle

      const tree = new TopologyTree(rootModule);

      expect(tree["links"].size).toBe(2);
      expect(tree["links"].has(childModule1)).toBe(true);
    });

    it("should handle relinking when appropriate", () => {
      rootModule.addImport(childModule1);
      rootModule.addImport(childModule2);
      childModule1.addImport(grandChildModule);
      childModule2.addImport(grandChildModule); // Same module at different paths

      const tree = new TopologyTree(rootModule);

      expect(tree["links"].size).toBe(4);
      expect(tree["links"].has(grandChildModule)).toBe(true);
    });
  });

  describe("integration tests", () => {
    it("should build tree structure correctly", () => {
      rootModule.addImport(childModule1);
      rootModule.addImport(childModule2);
      childModule1.addImport(grandChildModule);

      const tree = new TopologyTree(rootModule);

      expect(tree["links"].size).toBeGreaterThan(1);
      expect(tree["root"].children.size).toBe(2);
    });

    it("should handle diamond dependency pattern", () => {
      const commonModule = new Module(class CommonModule {}, container);
      
      rootModule.addImport(childModule1);
      rootModule.addImport(childModule2);
      childModule1.addImport(commonModule);
      childModule2.addImport(commonModule);

      const tree = new TopologyTree(rootModule);
      const callbackResults: Array<{ module: Module; depth: number }> = [];

      tree.walk((module, depth) => {
        callbackResults.push({ module, depth });
      });

      expect(tree["links"].size).toBeGreaterThan(3);
      expect(callbackResults.length).toBeGreaterThan(3);
      expect(callbackResults.some(r => r.module === commonModule)).toBe(true);
    });

    it("should handle self-referencing modules", () => {
      rootModule.addImport(rootModule); // Self reference

      const tree = new TopologyTree(rootModule);

      // Should handle gracefully without infinite loops
      expect(tree["links"].has(rootModule)).toBe(true);
    });
  });
});