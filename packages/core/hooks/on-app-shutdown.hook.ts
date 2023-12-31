import { getNonTransientInstances, getTransientInstances } from "@venok/core/helpers/transient.helper";
import { Module } from "@venok/core/injector/module/module";
import { isFunction, isNull } from "@venok/core/helpers/shared.helper";
import { InstanceWrapper } from "@venok/core/injector/instance/wrapper";
import { InjectionToken } from "@venok/core/interfaces";
import { OnApplicationShutdown } from "@venok/core/interfaces/hooks";

/**
 * Checks if the given instance has the `onApplicationShutdown` function
 *
 * @param instance The instance which should be checked
 */
function hasOnAppShutdownHook(instance: unknown): instance is OnApplicationShutdown {
  return isFunction((instance as OnApplicationShutdown).onApplicationShutdown);
}

/**
 * Calls the given instances
 */
function callOperator(instances: InstanceWrapper[], signal?: string): Promise<any>[] {
  return instances
    .filter((instance) => !isNull(instance))
    .filter(hasOnAppShutdownHook)
    .map(async (instance) => (instance as any as OnApplicationShutdown).onApplicationShutdown(signal));
}

/**
 * Calls the `onApplicationShutdown` function on the module and its children
 * (providers / controllers).
 *
 * @param module The module which will be initialized
 * @param signal
 */
export async function callAppShutdownHook(module: Module, signal?: string): Promise<any> {
  const providers = module.getNonAliasProviders();
  // Module (class) instance is the first element of the providers array
  // Lifecycle hook has to be called once all classes are properly initialized
  const [_, moduleClassHost] = providers.shift() as [InjectionToken, InstanceWrapper<unknown>];
  const instances = [...providers, ...module.injectables];

  const nonTransientInstances = getNonTransientInstances(instances);
  await Promise.all(callOperator(nonTransientInstances, signal));
  const transientInstances = getTransientInstances(instances);
  await Promise.all(callOperator(transientInstances, signal));

  // Call the instance itself
  const moduleClassInstance = moduleClassHost.instance;
  if (moduleClassInstance && hasOnAppShutdownHook(moduleClassInstance) && moduleClassHost.isDependencyTreeStatic()) {
    await (moduleClassInstance as OnApplicationShutdown).onApplicationShutdown(signal);
  }
}
