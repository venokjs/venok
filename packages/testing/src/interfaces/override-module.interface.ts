import type { ModuleDefinition } from "@venok/core";
import type { TestingModuleBuilder } from "~/testing/module-builder.js";

/**
 * @publicApi
 */
export interface OverrideModule {
  useModule: (newModule: ModuleDefinition) => TestingModuleBuilder;
}

export interface ModuleOverride {
  moduleToReplace: ModuleDefinition;
  newModule: ModuleDefinition;
}