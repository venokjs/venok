import { randomStringGenerator } from "@venok/core";

export function generateOptionsInjectionToken() {
  const hash = randomStringGenerator();
  return `CONFIGURABLE_MODULE_OPTIONS[${hash}]`;
}
