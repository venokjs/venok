import type { InjectionToken } from "~/interfaces/index.js";

import { InstanceWrapper } from "~/injector/instance/wrapper.js";

import { flatten } from "~/helpers/flatten.helper.js";

/**
 * Returns the instances which are transient
 * @param instances The instances which should be checked whether they are transient
 */
export function getTransientInstances(instances: [InjectionToken, InstanceWrapper][]): InstanceWrapper[] {
  return flatten(
    instances
      .filter(([, wrapper]) => wrapper.isDependencyTreeStatic())
      .map(([, wrapper]) => wrapper.getStaticTransientInstances())
  )
    .filter(Boolean)
    .map(({ instance }: any) => instance);
}

/**
 * Returns the instances which are not transient
 * @param instances The instances which should be checked whether they are transient
 */
export function getNonTransientInstances(instances: [InjectionToken, InstanceWrapper][]): InstanceWrapper[] {
  return instances
    .filter(([, wrapper]) => wrapper.isDependencyTreeStatic() && !wrapper.isTransient)
    .map(([, { instance }]) => instance);
}
