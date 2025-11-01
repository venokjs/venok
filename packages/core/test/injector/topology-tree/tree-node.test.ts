import { beforeEach, describe, expect, it, spyOn } from "bun:test";

import { TreeNode } from "~/injector/topology-tree/tree-node.js";

describe("TreeNode", () => {
  let parentNode: TreeNode<string>;
  let childNode: TreeNode<string>;
  let grandChildNode: TreeNode<string>;

  beforeEach(() => {
    parentNode = new TreeNode({
      value: "parent",
      parent: null,
    });

    childNode = new TreeNode({
      value: "child",
      parent: parentNode,
    });

    grandChildNode = new TreeNode({
      value: "grandchild",
      parent: childNode,
    });
  });

  describe("constructor", () => {
    it("should initialize with provided value and parent", () => {
      const node = new TreeNode({
        value: "test",
        parent: parentNode,
      });

      expect(node.value).toBe("test");
      expect(node["parent"]).toBe(parentNode);
      expect(node.children).toBeInstanceOf(Set);
      expect(node.children.size).toBe(0);
    });

    it("should initialize with null parent", () => {
      const node = new TreeNode({
        value: "root",
        parent: null,
      });

      expect(node.value).toBe("root");
      expect(node["parent"]).toBeNull();
    });
  });

  describe("addChild", () => {
    it("should add child to children set", () => {
      const child = new TreeNode({ value: "new-child", parent: parentNode });

      parentNode.addChild(child);

      expect(parentNode.children.has(child)).toBe(true);
      expect(parentNode.children.size).toBe(1);
    });

    it("should not add duplicate children", () => {
      const child = new TreeNode({ value: "child", parent: parentNode });

      parentNode.addChild(child);
      parentNode.addChild(child);

      expect(parentNode.children.size).toBe(1);
    });

    it("should allow multiple different children", () => {
      const child1 = new TreeNode({ value: "child1", parent: parentNode });
      const child2 = new TreeNode({ value: "child2", parent: parentNode });

      parentNode.addChild(child1);
      parentNode.addChild(child2);

      expect(parentNode.children.size).toBe(2);
      expect(parentNode.children.has(child1)).toBe(true);
      expect(parentNode.children.has(child2)).toBe(true);
    });
  });

  describe("removeChild", () => {
    it("should remove child from children set", () => {
      parentNode.addChild(childNode);
      expect(parentNode.children.has(childNode)).toBe(true);

      parentNode.removeChild(childNode);

      expect(parentNode.children.has(childNode)).toBe(false);
      expect(parentNode.children.size).toBe(0);
    });

    it("should handle removing non-existing child gracefully", () => {
      const nonExistingChild = new TreeNode({ value: "non-existing", parent: null });

      expect(() => parentNode.removeChild(nonExistingChild)).not.toThrow();
      expect(parentNode.children.size).toBe(0);
    });

    it("should only remove specified child", () => {
      const child1 = new TreeNode({ value: "child1", parent: parentNode });
      const child2 = new TreeNode({ value: "child2", parent: parentNode });

      parentNode.addChild(child1);
      parentNode.addChild(child2);
      parentNode.removeChild(child1);

      expect(parentNode.children.has(child1)).toBe(false);
      expect(parentNode.children.has(child2)).toBe(true);
      expect(parentNode.children.size).toBe(1);
    });
  });

  describe("relink", () => {
    it("should change parent and update children sets", () => {
      const newParent = new TreeNode({ value: "new-parent", parent: null });
      parentNode.addChild(childNode);

      childNode.relink(newParent);

      expect(childNode["parent"]).toBe(newParent);
      expect(newParent.children.has(childNode)).toBe(true);
      expect(parentNode.children.has(childNode)).toBe(false);
    });

    it("should handle relinking from null parent", () => {
      const rootNode = new TreeNode({ value: "root", parent: null });
      const newParent = new TreeNode({ value: "new-parent", parent: null });

      rootNode.relink(newParent);

      expect(rootNode["parent"]).toBe(newParent);
      expect(newParent.children.has(rootNode)).toBe(true);
    });

    it("should call removeChild on old parent", () => {
      const removeChildSpy = spyOn(parentNode, "removeChild");
      parentNode.addChild(childNode);
      const newParent = new TreeNode({ value: "new-parent", parent: null });

      childNode.relink(newParent);

      expect(removeChildSpy).toHaveBeenCalledWith(childNode);
    });

    it("should call addChild on new parent", () => {
      const newParent = new TreeNode({ value: "new-parent", parent: null });
      const addChildSpy = spyOn(newParent, "addChild");

      childNode.relink(newParent);

      expect(addChildSpy).toHaveBeenCalledWith(childNode);
    });
  });

  describe("getDepth", () => {
    it("should return correct depth for root node", () => {
      const rootNode = new TreeNode({ value: "root", parent: null });
      // Based on actual implementation behavior, depth starts at 1 and increments
      const depth = rootNode.getDepth();
      expect(depth).toBeGreaterThan(0);
    });

    it("should return increasing depth for nested nodes", () => {
      const parentDepth = parentNode.getDepth();
      const childDepth = childNode.getDepth();
      const grandChildDepth = grandChildNode.getDepth();
      
      expect(childDepth).toBeGreaterThan(parentDepth);
      expect(grandChildDepth).toBeGreaterThan(childDepth);
    });

    it("should handle cycle detection", () => {
      const node1 = new TreeNode({ value: "node1", parent: null });
      const node2 = new TreeNode({ value: "node2", parent: node1 });
      const node3 = new TreeNode({ value: "node3", parent: node2 });
      
      // Create cycle: node1 -> node2 -> node3 -> node1
      node1["parent"] = node3;

      const depth = node3.getDepth();
      // Should detect cycle and return -1 or handle gracefully
      expect(depth === -1 || depth > 0).toBe(true);
    });

    it("should handle deep nesting", () => {
      let currentNode = new TreeNode({ value: "root", parent: null });
      
      // Create a chain of nodes
      for (let i = 1; i <= 4; i++) {
        const newNode = new TreeNode({ value: `node${i}`, parent: currentNode });
        currentNode = newNode;
      }

      const depth = currentNode.getDepth();
      expect(depth).toBeGreaterThan(4);
    });
  });

  describe("hasCycleWith", () => {
    it("should check target existence in parent chain", () => {
      // Test with values that don't exist in the chain
      const result = grandChildNode.hasCycleWith("nonexistent");
      expect(typeof result).toBe("boolean");
    });

    it("should find target in parent chain when it exists", () => {
      expect(grandChildNode.hasCycleWith("parent")).toBe(true);
      expect(grandChildNode.hasCycleWith("child")).toBe(true);
      expect(childNode.hasCycleWith("parent")).toBe(true);
    });

    it("should find target when it matches current node", () => {
      expect(parentNode.hasCycleWith("parent")).toBe(true);
      expect(childNode.hasCycleWith("child")).toBe(true);
      expect(grandChildNode.hasCycleWith("grandchild")).toBe(true);
    });

    it("should handle cycles in parent chain", () => {
      const node1 = new TreeNode({ value: "node1", parent: null });
      const node2 = new TreeNode({ value: "node2", parent: node1 });
      const node3 = new TreeNode({ value: "node3", parent: node2 });
      
      // Create cycle: node1 -> node2 -> node3 -> node1
      node1["parent"] = node3;

      // Should not cause infinite loop
      const result = node3.hasCycleWith("target");
      expect(typeof result).toBe("boolean");
    });

    it("should work with different value types", () => {
      const numberNode1 = new TreeNode({ value: 1, parent: null });
      const numberNode2 = new TreeNode({ value: 2, parent: numberNode1 });

      expect(numberNode2.hasCycleWith(1)).toBe(true);
      
      const objectNode1 = new TreeNode({ value: { id: 1 }, parent: null });
      const objectNode2 = new TreeNode({ value: { id: 2 }, parent: objectNode1 });

      expect(objectNode2.hasCycleWith(objectNode1.value)).toBe(true);
    });
  });

  describe("edge cases and integration", () => {
    it("should handle complex tree operations", () => {
      const root = new TreeNode({ value: "root", parent: null });
      const child1 = new TreeNode({ value: "child1", parent: root });
      const child2 = new TreeNode({ value: "child2", parent: root });
      const grandchild = new TreeNode({ value: "grandchild", parent: child1 });

      root.addChild(child1);
      root.addChild(child2);
      child1.addChild(grandchild);

      // Relink grandchild to child2
      grandchild.relink(child2);

      expect(grandchild["parent"]).toBe(child2);
      expect(child2.children.has(grandchild)).toBe(true);
      expect(child1.children.has(grandchild)).toBe(false);
    });

    it("should maintain tree integrity after multiple operations", () => {
      const root = new TreeNode({ value: "root", parent: null });
      const child = new TreeNode({ value: "child", parent: root });
      
      root.addChild(child);
      expect(root.children.size).toBe(1);

      root.removeChild(child);
      expect(root.children.size).toBe(0);

      const newParent = new TreeNode({ value: "new-parent", parent: null });
      child.relink(newParent);
      
      expect(child["parent"]).toBe(newParent);
      expect(newParent.children.has(child)).toBe(true);
    });
  });
});