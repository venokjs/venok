import type { InjectorDependencyContext } from "~/interfaces/index.js";

export interface SerializedGraphMetadata {
  cause: {
    type: "unknown-dependencies" | "unknown";
    context?: InjectorDependencyContext;
    moduleId?: string;
    nodeId?: string;
    error?: any;
  };
}
