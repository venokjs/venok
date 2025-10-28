import type { OnApplicationBootstrap } from "~/interfaces/hooks/index.js";
import type { InjectionToken } from "~/interfaces/index.js";

import { getNonTransientInstances, getTransientInstances } from "~/helpers/transient.helper.js";
import { isFunction, isNull } from "~/helpers/shared.helper.js";

import { InstanceWrapper } from "~/injector/instance/wrapper.js";
import { Module } from "~/injector/module/module.js";

/**
 * Checks if the given instance has the `onApplicationBootstrap` function
 *
 * @param instance The instance which should be checked
 */
function hasOnAppBootstrapHook(instance: unknown): instance is OnApplicationBootstrap {
  return isFunction((instance as OnApplicationBootstrap).onApplicationBootstrap);
}

/**
 * Calls the given instances
 */
function callOperator(instances: InstanceWrapper[]): Promise<any>[] {
  return instances
    .filter((instance) => !isNull(instance))
    .filter(hasOnAppBootstrapHook)
    .map(async (instance) => (instance as any as OnApplicationBootstrap).onApplicationBootstrap());
}

/**
 * Calls the `onApplicationBootstrap` function on the module and its children
 * (providers / controllers).
 *
 * @param module The module which will be initialized
 */
export async function callModuleBootstrapHook(module: Module): Promise<any> {
  const providers = module.getNonAliasProviders();
  // Module (class) instance is the first element of the providers array
  // Lifecycle hook has to be called once all classes are properly initialized
  const [_, moduleClassHost] = providers.shift() as [InjectionToken, InstanceWrapper<unknown>];
  const instances = [...providers, ...module.injectables];

  const nonTransientInstances = getNonTransientInstances(instances);
  await Promise.all(callOperator(nonTransientInstances));
  const transientInstances = getTransientInstances(instances);
  await Promise.all(callOperator(transientInstances));

  // Call the instance itself
  const moduleClassInstance = moduleClassHost.instance;
  if (moduleClassInstance && hasOnAppBootstrapHook(moduleClassInstance) && moduleClassHost.isDependencyTreeStatic()) {
    await (moduleClassInstance as OnApplicationBootstrap).onApplicationBootstrap();
  }
}
