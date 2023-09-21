import { isFunction, isNull } from "@venok/core/utils/shared.utils";
import { InstanceWrapper } from "@venok/core/injector/instance/wrapper";
import { Module } from "@venok/core/injector/module/module";
import { getNonTransientInstances, getTransientInstances } from "@venok/core/helpers/transient.helper";
import { InjectionToken } from "@venok/core/interfaces";
import { OnApplicationBootstrap } from "@venok/core/interfaces/hooks";

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
