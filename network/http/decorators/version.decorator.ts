import { VersionValue } from "../interfaces";
import { VERSION_METADATA } from "../constants";
import { Reflector } from "@venok/core";

/**
 * Sets the version of the endpoint to the passed version
 *
 * @publicApi
 */

export const Version = Reflector.createDecorator<VersionValue>({
  type: "method",
  key: VERSION_METADATA,
  transform: (version) => {
    // Drop duplicated versions
    if (Array.isArray(version)) version = Array.from(new Set(version));

    return version;
  },
});
