import type { OverrideByFactoryOptions } from "~/interfaces/override-by-factory-options.interface.js";
import type { TestingModuleBuilder } from "~/testing/module-builder.js";


/**
 * @publicApi
 */
export interface OverrideBy {
  useValue: (value: any) => TestingModuleBuilder;
  useFactory: (options: OverrideByFactoryOptions) => TestingModuleBuilder;
  useClass: (metatype: any) => TestingModuleBuilder;
}