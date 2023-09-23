import { InjectionToken } from "@venok/core/interfaces";
import { InstanceWrapper } from "@venok/core/injector/instance/wrapper";
import { getNonTransientInstances, getTransientInstances } from "@venok/core/helpers/transient.helper";
import { Module } from "@venok/core/injector/module/module";
import { isFunction, isNull } from "@venok/core/utils/shared.utils";
import { OnModuleInit } from "@venok/core/interfaces/hooks";

/**
 * Returns true or false if the given instance has a `onModuleInit` function
 *
 * @param instance The instance which should be checked
 */
function hasOnModuleInitHook(instance: unknown): instance is OnModuleInit {
  return isFunction((instance as OnModuleInit).onModuleInit);
}

/**
 * Calls the given instances
 */
function callOperator(instances: InstanceWrapper[]): Promise<any>[] {
  return instances
    .filter((instance) => !isNull(instance))
    .filter(hasOnModuleInitHook)
    .map(async (instance) => (instance as any as OnModuleInit).onModuleInit());
}

/**
 * Calls the `onModuleInit` function on the module and its children
 * (providers / controllers).
 *
 * @param module The module which will be initialized
 */
export async function callModuleInitHook(module: Module): Promise<void> {
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
  if (moduleClassInstance && hasOnModuleInitHook(moduleClassInstance) && moduleClassHost.isDependencyTreeStatic()) {
    await (moduleClassInstance as OnModuleInit).onModuleInit();
  }
}
