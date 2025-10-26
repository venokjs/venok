import type { ModuleDefinition } from "@venok/core/interfaces/modules/definition.interface.js";

export interface ModuleOverride {
  moduleToReplace: ModuleDefinition;
  newModule: ModuleDefinition;
}
