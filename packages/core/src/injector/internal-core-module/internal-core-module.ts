import type { DynamicModule, ExistingProvider, FactoryProvider, ValueProvider } from "~/interfaces/index.js";

import {
  inquirerProvider,
  ReflectorAliasProvider,
  requestProvider
} from "~/injector/internal-core-module/core-providers.js";

import { Global } from "~/decorators/global.decorator.js";
import { Module } from "~/decorators/module.decorator.js";
import { Reflector } from "~/services/reflector.service.js";

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
