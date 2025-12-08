import type { ModuleMetadata, Provider } from "~/interfaces/index.js";

import { MODULE_METADATA as metadataConstants } from "~/constants.js";

const reservedMetadataKeys = [metadataConstants.IMPORTS, metadataConstants.EXPORTS, metadataConstants.PROVIDERS];

/**
 * Extended interface for Module decorator that allows custom keys
 */
interface ExtendedModuleMetadata {
  /**
   * Allows any additional keys (controllers, queues, processors, etc.)
   * that will be automatically added to the providers array.
   */

  [key: string]: Provider[];
}

/**
 * Decorator that marks a class as a module.
 *
 * Modules are used by Venok to organize the application structure into scopes.
 * Providers are scoped by the module they are declared in. Modules and their
 * classes (Providers) form a graph that determines how Venok
 *
 * @param metadata module configuration metadata
 *
 * @publicApi
 */
export function Module(metadata: ModuleMetadata & ExtendedModuleMetadata): ClassDecorator {
  return (target: Function) => {
    const allProviders: any[] = [...(metadata.providers || [])];
    
    for (const property in metadata) {
      if (Object.prototype.hasOwnProperty.call(metadata, property)) {
        if (reservedMetadataKeys.includes(property) && property !== metadataConstants.PROVIDERS) {
          Reflect.defineMetadata(property, (metadata as any)[property], target);
        } else if (!reservedMetadataKeys.includes(property)) {
          // If it's custom key, add content to providers
          const customProviders = (metadata as any)[property];

          if (Array.isArray(customProviders)) allProviders.push(...customProviders as Provider[]);
        }
      }
    }

    if (allProviders.length > 0) Reflect.defineMetadata(metadataConstants.PROVIDERS, allProviders, target);
  };
}
