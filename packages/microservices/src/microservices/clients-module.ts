import type { DynamicModule, ForwardReference, OnApplicationShutdown, Provider, Type } from "@venok/core";

import type {
  ClientsModuleAsyncOptions,
  ClientsModuleOptions,
  ClientsModuleOptionsFactory,
  ClientsProviderAsyncOptions
} from "~/interfaces/index.js";

import { Module } from "@venok/core";

import { MicroserviceClient, MicroserviceClientFactory } from "~/microservices/client.js";


@Module({})
export class ClientsModule {
  static register(options: ClientsModuleOptions): DynamicModule {
    const clientsOptions = !Array.isArray(options) ? options.clients : options;
    const clients = (clientsOptions || []).map(item => {
      return {
        provide: item.name,
        useValue: this.assignOnAppShutdownHook(MicroserviceClientFactory.create(item)),
      };
    });
    return {
      module: ClientsModule,
      global: !Array.isArray(options) && options.isGlobal,
      providers: clients,
      exports: clients,
    };
  }

  static registerAsync(options: ClientsModuleAsyncOptions): DynamicModule {
    const clientsOptions = !Array.isArray(options) ? options.clients : options;
    const providers: Provider[] = clientsOptions.reduce(
      (accProviders: Provider[], item) =>
        accProviders
          .concat(this.createAsyncProviders(item))
          .concat(item.extraProviders || []),
      []
    );
    const imports = clientsOptions.reduce(
      (accImports, option) => {
        if (!option.imports) return accImports;

        const toInsert = option.imports.filter(item => !accImports.includes(item));
        return accImports.concat(toInsert);
      },
      [] as Array<
        DynamicModule | Promise<DynamicModule> | ForwardReference | Type
      >
    );
    return {
      module: ClientsModule,
      global: !Array.isArray(options) && options.isGlobal,
      imports,
      providers: providers,
      exports: providers,
    };
  }

  private static createAsyncProviders(
    options: ClientsProviderAsyncOptions
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }
    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: options.useClass!,
        useClass: options.useClass!,
      },
    ];
  }

  private static createAsyncOptionsProvider(
    options: ClientsProviderAsyncOptions
  ): Provider {
    if (options.useFactory) {
      return {
        provide: options.name,
        useFactory: this.createFactoryWrapper(options.useFactory),
        inject: options.inject || [],
      };
    }
    return {
      provide: options.name,
      useFactory: this.createFactoryWrapper(
        (optionsFactory: ClientsModuleOptionsFactory) => optionsFactory.createClientOptions()
      ),
      inject: [options.useExisting || options.useClass!],
    };
  }

  private static createFactoryWrapper(
    useFactory: ClientsProviderAsyncOptions["useFactory"]
  ) {
    return async (...args: any[]) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const clientOptions = await useFactory!(...args);
      const clientProxyRef = MicroserviceClientFactory.create(clientOptions);
      return this.assignOnAppShutdownHook(clientProxyRef);
    };
  }

  private static assignOnAppShutdownHook(client: MicroserviceClient) {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    (client as unknown as OnApplicationShutdown).onApplicationShutdown = client.close;
    return client;
  }
}