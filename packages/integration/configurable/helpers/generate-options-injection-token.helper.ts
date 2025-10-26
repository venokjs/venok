import { randomStringGenerator } from "@venok/core/helpers/random-string-generator.helper.js";

export function generateOptionsInjectionToken() {
  const hash = randomStringGenerator();
  return `CONFIGURABLE_MODULE_OPTIONS[${hash}]`;
}
