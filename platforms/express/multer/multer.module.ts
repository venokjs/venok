import { DynamicModule, InjectionToken, Module, Provider, Type } from "@venok/core";
import { MulterModuleAsyncOptions, MulterModuleOptions, MulterOptionsFactory } from "./interfaces";
import { MULTER_MODULE_OPTIONS } from "./files.constants";
import { MULTER_MODULE_ID } from "./multer.constants";
import { randomStringGenerator } from "@venok/core/helpers/random-string-generator.helper";

/**
 * @publicApi
 */
@Module({})
export class MulterModule {
  static register(options: MulterModuleOptions = {}): DynamicModule {
    return {
      module: MulterModule,
      providers: [
        { provide: MULTER_MODULE_OPTIONS, useValue: options },
        {
          provide: MULTER_MODULE_ID,
          useValue: randomStringGenerator(),
        },
      ],
      exports: [MULTER_MODULE_OPTIONS],
    };
  }

  static registerAsync(options: MulterModuleAsyncOptions): DynamicModule {
    return {
      module: MulterModule,
      imports: options.imports,
      providers: [
        ...this.createAsyncProviders(options),
        {
          provide: MULTER_MODULE_ID,
          useValue: randomStringGenerator(),
        },
      ],
      exports: [MULTER_MODULE_OPTIONS],
    };
  }

  private static createAsyncProviders(options: MulterModuleAsyncOptions): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }
    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: options.useClass as InjectionToken,
        useClass: options.useClass as Type,
      },
    ];
  }

  private static createAsyncOptionsProvider(options: MulterModuleAsyncOptions): Provider {
    if (options.useFactory) {
      return {
        provide: MULTER_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }
    return {
      provide: MULTER_MODULE_OPTIONS,
      useFactory: async (optionsFactory: MulterOptionsFactory) => optionsFactory.createMulterOptions(),
      inject: [(options.useExisting as InjectionToken) || (options.useClass as Type)],
    };
  }
}
