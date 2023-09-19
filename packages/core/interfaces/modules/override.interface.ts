import { ModuleDefinition } from "@venok/core/interfaces/modules/definition.interface";

export interface ModuleOverride {
  moduleToReplace: ModuleDefinition;
  newModule: ModuleDefinition;
}
