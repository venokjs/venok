import { GraphInspector } from "./graph-inspector";
import { noop } from "@venok/core/helpers/noop.helper";

export const NoopGraphInspector: GraphInspector = new Proxy(GraphInspector.prototype, {
  get: () => noop,
});
