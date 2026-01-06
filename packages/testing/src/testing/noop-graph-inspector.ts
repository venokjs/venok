import { GraphInspector } from "@venok/core";


const noop = () => {};
export const NoopGraphInspector: GraphInspector = new Proxy(GraphInspector.prototype, { get: () => noop });