import { GraphInspector } from "./graph-inspector.js";
import { noop } from "@venok/core/helpers/noop.helper.js";

export const NoopGraphInspector: GraphInspector = new Proxy(GraphInspector.prototype, {
  get: () => noop,
});
