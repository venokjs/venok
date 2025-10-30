import type { ModuleMetadata, Type } from "@venok/core";
import type { MulterOptions } from "./multer-options.interface.js";

export type MulterModuleOptions = MulterOptions;

/**
 * @publicApi
 */
export interface MulterOptionsFactory {
  createMulterOptions(): Promise<MulterModuleOptions> | MulterModuleOptions;
}

/**
 * @publicApi
 */
export interface MulterModuleAsyncOptions extends Pick<ModuleMetadata, "imports"> {
  useExisting?: Type<MulterOptionsFactory>;
  useClass?: Type<MulterOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<MulterModuleOptions> | MulterModuleOptions;
  inject?: any[];
}
