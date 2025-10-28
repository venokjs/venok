import type { DynamicModule, ForwardReference, Type } from "~/interfaces/index.js";

export type ModuleDefinition = ForwardReference | Type | DynamicModule | Promise<DynamicModule>;
