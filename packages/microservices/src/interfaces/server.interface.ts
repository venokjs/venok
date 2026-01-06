import type { InjectionToken, Type } from "@venok/core";

import type { TransportId } from "~/interfaces/transport.interface.js";
import type { MicroserviceServer } from "~/microservices/server.js";

export type AsyncMicroserviceOptions = {
  inject: InjectionToken[];
  useFactory: (...args: any[]) => MicroserviceServerOptions;
};

/**
 * @publicApi
 */
export type MicroserviceServerOptions = {
  strategy: Type<MicroserviceServer>;
  options?: Record<string, any>;
};

export type ProcessingStartHook = (
  transportId: TransportId,
  context: unknown,
  done: () => Promise<any>
) => void;