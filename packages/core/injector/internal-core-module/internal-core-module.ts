import { Reflector } from "@venok/core/services/index.js";
import { Global } from "@venok/core/decorators/global.decorator.js";
import { Module } from "@venok/core/decorators/module.decorator.js";
import type {
  DynamicModule,
  ExistingProvider,
  FactoryProvider,
  ValueProvider,
} from "@venok/core/interfaces/modules/index.js";
import {
  inquirerProvider,
  ReflectorAliasProvider,
  requestProvider,
} from "@venok/core/injector/internal-core-module/core-providers.js";

@Global()
@Module({
  providers: [Reflector, ReflectorAliasProvider, requestProvider, inquirerProvider],
  exports: [Reflector, ReflectorAliasProvider, requestProvider, inquirerProvider],
})
export class InternalCoreModule {
  static register(providers: Array<ValueProvider | FactoryProvider | ExistingProvider>): DynamicModule {
    return {
      module: InternalCoreModule,
      providers: [...providers],
      exports: [...providers.map((item) => item.provide)],
    };
  }
}
