import type { Type } from "@venok/core";
import type { TransportId } from "~/interfaces/transport.interface.js";
import type { MicroserviceServer } from "~/microservices/server.js";

export interface MicroserviceAppOptions {
  transport: Type<MicroserviceServer>,
  transportId: TransportId
  options: Record<string, any>
}