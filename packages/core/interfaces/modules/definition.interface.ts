import { ForwardReference } from "@venok/core/interfaces/modules/forward-reference.interface";
import { Type } from "@venok/core/interfaces";
import { DynamicModule } from "@venok/core/interfaces/modules/dynamic-module.interface";

export type ModuleDefinition = ForwardReference | Type | DynamicModule | Promise<DynamicModule>;
