import type { AdapterMiddlewareMetadata } from "~/interfaces/index.js";

import { HttpMethod } from "~/enums/method.enum.js";

interface MiddlewareNode {
  segment: string;
  children: Map<string, MiddlewareNode>;
  middlewares: AdapterMiddlewareMetadata[];
}

export const buildMiddlewareTree = (middlewares: AdapterMiddlewareMetadata[]): MiddlewareNode => {
  const root: MiddlewareNode = { segment: "/", children: new Map(), middlewares: [] };

  for (const mw of middlewares) {
    const parts = mw.path.split("/").filter(Boolean); // ['api', ':id', '*', ...]
    let current = root;

    for (const part of parts) {
      if (!current.children.has(part)) current.children.set(part, { segment: part, children: new Map(), middlewares: [] });
      
      current = current.children.get(part)!;
    }

    current.middlewares.push(mw);
  }

  return root;
};

export const filterMiddlewaresByMethod = (middlewares: AdapterMiddlewareMetadata[], method: HttpMethod): AdapterMiddlewareMetadata[] => {
  return middlewares
    .map(middleware => {
      const handlers = middleware.handlers.filter(metadata => metadata.method === method || metadata.method === HttpMethod.ALL);

      if (handlers.length === 0) return null;

      return { path: middleware.path, handlers };
    })
    .filter(Boolean) as AdapterMiddlewareMetadata[];
};

/* Danger zone - maybe bugs */
export const getMiddlewaresForPattern = (tree: MiddlewareNode, pathPattern: string, method: HttpMethod): AdapterMiddlewareMetadata[] => {
  const parts = pathPattern.split("/").filter(Boolean);
  const chain: AdapterMiddlewareMetadata[] = [];
  const visited = new Set<string>(); 

  function addMiddleware(node: MiddlewareNode) {
    if (!node.middlewares.length) return;
    
    const filtered = filterMiddlewaresByMethod(node.middlewares, method);
    for (const middleware of filtered) {
      if (!visited.has(middleware.path)) {
        chain.push(middleware);
        visited.add(middleware.path);
      }
    }
  }

  function traversePath(node: MiddlewareNode | undefined, pathIndex: number): void {
    if (!node) return;

    // Add middleware from current node
    addMiddleware(node);

    // If we've processed all parts, we're done
    if (pathIndex >= parts.length) return;

    const part = parts[pathIndex];

    // Collect middleware from wildcard and param children that match this part
    const wildcard = node.children.get("*");
    if (wildcard && part !== "*") {
      addMiddleware(wildcard);
      // Continue traversing through wildcard path
      traversePath(wildcard, pathIndex + 1);
    }

    const paramNode: MiddlewareNode | undefined = Array.from(node.children.values()).find(c => c.segment.startsWith(":"));
    if (paramNode && !part.startsWith(":")) {
      addMiddleware(paramNode);
      // Continue traversing through param path
      traversePath(paramNode, pathIndex + 1);
    }

    // Try literal match
    const literalNode = node.children.get(part);
    if (literalNode) {
      traversePath(literalNode, pathIndex + 1);
      return; // Literal has priority, so if found, don't try fallbacks
    }

    // Try explicit param/wildcard patterns if no literal match
    if (part.startsWith(":") && paramNode) {
      traversePath(paramNode, pathIndex + 1);
    } else if (part === "*" && wildcard) {
      traversePath(wildcard, pathIndex + 1);
    }
  }

  traversePath(tree, 0);
  return chain;
};
