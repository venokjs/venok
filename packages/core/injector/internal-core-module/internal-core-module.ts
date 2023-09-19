import { Reflector } from "@venok/core/services";
import { Global } from "@venok/core/decorators/global.decorator";
import { Module } from "@venok/core/decorators/module.decorator";
import {
  DynamicModule,
  ExistingProvider,
  FactoryProvider,
  Provider,
  ValueProvider,
} from "@venok/core/interfaces/modules";
import {
  inquirerProvider,
  ReflectorAliasProvider,
  requestProvider,
} from "@venok/core/injector/internal-core-module/core-providers";

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
