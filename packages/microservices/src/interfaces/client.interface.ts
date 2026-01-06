import type { Type } from "@venok/core";

import { MicroserviceClient } from "~/microservices/client.js";

/**
 * @publicApi
 */
export type MicroserviceClientOptions = {
  customClass: Type<MicroserviceClient>;
  options?: Record<string, any>;
};