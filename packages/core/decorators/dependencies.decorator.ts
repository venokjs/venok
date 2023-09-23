import { PARAMTYPES_METADATA } from "@venok/core/constants";
import { flatten } from "@venok/core/helpers/flatten.helper";

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
