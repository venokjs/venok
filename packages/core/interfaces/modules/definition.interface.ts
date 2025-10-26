import type { ForwardReference } from "@venok/core/interfaces/modules/forward-reference.interface.js";
import type { Type } from "@venok/core/interfaces/index.js";
import type { DynamicModule } from "@venok/core/interfaces/modules/dynamic-module.interface.js";

export type ModuleDefinition = ForwardReference | Type | DynamicModule | Promise<DynamicModule>;
