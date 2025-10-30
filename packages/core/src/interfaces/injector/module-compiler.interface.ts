import type { DynamicModule, Type } from "~/interfaces/index.js";

export interface ModuleFactory {
  type: Type;
  token: string;
  dynamicMetadata?: Partial<DynamicModule>;
}
