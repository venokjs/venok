import { flatten } from "~/helpers/flatten.helper.js";

import { PARAMTYPES_METADATA } from "~/constants.js";

/**
 * Decorator that sets required dependencies (required with a vanilla JavaScript objects)
 *
 * @publicApi
 */
export const Dependencies = (...dependencies: Array<unknown>): ClassDecorator => {
  const flattenDeps = flatten(dependencies);
  return (target: object) => {
    Reflect.defineMetadata(PARAMTYPES_METADATA, flattenDeps, target);
  };
};
