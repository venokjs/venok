import { MODULE_METADATA as metadataConstants } from "../constants.js";
import type { ModuleMetadata } from "@venok/core/interfaces/modules/index.js";

export const INVALID_MODULE_CONFIG_MESSAGE = (text: TemplateStringsArray, property: string) =>
  `Invalid property '${property}' passed into the @Module() decorator.`;

const metadataKeys = [metadataConstants.IMPORTS, metadataConstants.EXPORTS, metadataConstants.PROVIDERS];

function validateModuleKeys(keys: string[]) {
  const validateKey = (key: string) => {
    if (metadataKeys.includes(key)) return;

    throw new Error(INVALID_MODULE_CONFIG_MESSAGE`${key}`);
  };

  keys.forEach(validateKey);
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
export function Module(metadata: ModuleMetadata): ClassDecorator {
  const propsKeys = Object.keys(metadata);
  validateModuleKeys(propsKeys);

  return (target: Function) => {
    for (const property in metadata) {
      if (metadata.hasOwnProperty(property)) {
        Reflect.defineMetadata(property, (metadata as any)[property], target);
      }
    }
  };
}
