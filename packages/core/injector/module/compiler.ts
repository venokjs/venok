import type { Type } from "@venok/core/interfaces/index.js";
import type { DynamicModule } from "@venok/core/interfaces/modules/dynamic-module.interface.js";
import type { ForwardReference } from "@venok/core/interfaces/modules/forward-reference.interface.js";
import { TokenFactory } from "@venok/core/injector/module/token-factory.js";

export interface ModuleFactory {
  type: Type;
  token: string;
  dynamicMetadata?: Partial<DynamicModule>;
}

export class ModuleCompiler {
  constructor(private readonly moduleTokenFactory = new TokenFactory()) {}

  public async compile(metatype: Type | DynamicModule | Promise<DynamicModule>): Promise<ModuleFactory> {
    const { type, dynamicMetadata } = this.extractMetadata(await metatype);
    const token = this.moduleTokenFactory.create(type, dynamicMetadata);
    return { type, dynamicMetadata, token };
  }

  public extractMetadata(metatype: Type | ForwardReference | DynamicModule): {
    type: Type;
    dynamicMetadata?: Partial<DynamicModule> | undefined;
  } {
    if (!this.isDynamicModule(metatype)) {
      return {
        type: (metatype as ForwardReference)?.forwardRef ? (metatype as ForwardReference).forwardRef() : metatype,
      };
    }
    const { module: type, ...dynamicMetadata } = metatype;
    return { type, dynamicMetadata };
  }

  public isDynamicModule(module: Type | DynamicModule | ForwardReference): module is DynamicModule {
    return !!(module as DynamicModule).module;
  }
}
