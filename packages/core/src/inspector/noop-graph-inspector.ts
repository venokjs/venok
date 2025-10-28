import { GraphInspector } from "~/inspector/graph-inspector.js";
import { noop } from "~/helpers/noop.helper.js";

export const NoopGraphInspector: GraphInspector = new Proxy(GraphInspector.prototype, {
  get: () => noop,
});
