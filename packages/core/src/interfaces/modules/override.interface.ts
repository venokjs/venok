import type { ModuleDefinition } from "~/interfaces/index.js";

export interface ModuleOverride {
  moduleToReplace: ModuleDefinition;
  newModule: ModuleDefinition;
}
