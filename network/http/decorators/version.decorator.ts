import { Reflector } from "@venok/core";

import { VersionValue } from "@venok/http/interfaces";
import { VERSION_METADATA } from "@venok/http/constants";

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
