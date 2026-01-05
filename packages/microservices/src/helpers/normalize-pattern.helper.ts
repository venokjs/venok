import type { MicroservicePattern } from "~/interfaces/index.js";
import { isNumber, isObject, isString } from "@venok/core";


/**
 * Normalize the Pattern.
 * 1. If Pattern is a `string`, it will be returned as it is.
 * 2. If Pattern is a `number`, it will be converted to `string`.
 * 3. If Pattern is a `JSON` object, it will be transformed. For that end,
 * the function will sort properties of `JSON` Object and creates `route` string
 * according to the following template:
 * <key1>:<value1>,<key2>:<value2>,...,<keyN>:<valueN>
 *
 * @param  {MsPattern} pattern - client pattern
 * @returns string
 */
export function normalizePattern(pattern: MicroservicePattern): string {
  if (isString(pattern) || isNumber(pattern)) return `${pattern}`;
  
  if (!isObject(pattern)) return pattern;
  
  const sortedKeys = Object.keys(pattern).sort((a, b) => ("" + a).localeCompare(b));

  // Creates the array of Pattern params from sorted keys and their corresponding values
  const sortedPatternParams = sortedKeys.map(key => {
    let partialRoute = `"${key}":`;
    partialRoute += isString(pattern[key])
      ? `"${normalizePattern(pattern[key])}"`
      : normalizePattern(pattern[key]);
    return partialRoute;
  });

  return `{${sortedPatternParams.join(",")}}`;
}