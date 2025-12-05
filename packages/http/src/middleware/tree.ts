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


export const getMiddlewaresForPattern = (tree: MiddlewareNode, pathPattern: string, method: HttpMethod): AdapterMiddlewareMetadata[] => {
  const parts = pathPattern.split("/").filter(Boolean);
  let current: MiddlewareNode | undefined = tree;
  const chain: AdapterMiddlewareMetadata[] = [];

  for (const part of parts) {
    if (!current) break;

    // middleware
    if (current.middlewares.length) chain.push(...filterMiddlewaresByMethod(current.middlewares, method));

    // wildcard
    const wildcard = current.children.get("*");
    if (wildcard) chain.push(...filterMiddlewaresByMethod(wildcard.middlewares, method));

    // param (:id, :prefix)
    const paramNode: MiddlewareNode | undefined = Array.from(current.children.values()).find(c => c.segment.startsWith(":"));
    if (paramNode) chain.push(...filterMiddlewaresByMethod(paramNode.middlewares, method));

    // literal
    const next = current.children.get(part);
    if (next) { current = next; continue; }

    // param
    if (part.startsWith(":") && paramNode) { current = paramNode; continue; }

    // wildcard
    if (part === "*" && wildcard) { current = wildcard; continue; }

    break;
  }

  if (current?.middlewares.length) chain.push(...filterMiddlewaresByMethod(current.middlewares, method));

  return chain;
};
