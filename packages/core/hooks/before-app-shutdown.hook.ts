import { isFunction, isNull } from "@venok/core/helpers/shared.helper.js";
import { InstanceWrapper } from "@venok/core/injector/instance/wrapper.js";
import { Module } from "@venok/core/injector/module/module.js";
import type { InjectionToken } from "@venok/core/interfaces/index.js";
import { getNonTransientInstances, getTransientInstances } from "@venok/core/helpers/transient.helper.js";
import type { BeforeApplicationShutdown } from "@venok/core/interfaces/hooks/index.js";

/**
 * Checks if the given instance has the `beforeApplicationShutdown` function
 *
 * @param instance The instance which should be checked
 */
function hasBeforeApplicationShutdownHook(instance: unknown): instance is BeforeApplicationShutdown {
  return isFunction((instance as BeforeApplicationShutdown).beforeApplicationShutdown);
}

/**
 * Calls the given instances
 */
function callOperator(instances: InstanceWrapper[], signal?: string): Promise<any>[] {
  return instances
    .filter((instance) => !isNull(instance))
    .filter(hasBeforeApplicationShutdownHook)
    .map(async (instance) => (instance as any as BeforeApplicationShutdown).beforeApplicationShutdown(signal));
}

/**
 * Calls the `beforeApplicationShutdown` function on the module and its children
 * (providers / controllers).
 *
 * @param module The module which will be initialized
 * @param signal The signal which caused the shutdown
 */
export async function callBeforeAppShutdownHook(module: Module, signal?: string): Promise<void> {
  const providers = module.getNonAliasProviders();
  const [_, moduleClassHost] = providers.shift() as [InjectionToken, InstanceWrapper];
  const instances = [...providers, ...module.injectables];

  const nonTransientInstances = getNonTransientInstances(instances);
  await Promise.all(callOperator(nonTransientInstances, signal));
  const transientInstances = getTransientInstances(instances);
  await Promise.all(callOperator(transientInstances, signal));

  const moduleClassInstance = moduleClassHost.instance;
  if (
    moduleClassInstance &&
    hasBeforeApplicationShutdownHook(moduleClassInstance) &&
    moduleClassHost.isDependencyTreeStatic()
  ) {
    await (moduleClassInstance as BeforeApplicationShutdown).beforeApplicationShutdown(signal);
  }
}
