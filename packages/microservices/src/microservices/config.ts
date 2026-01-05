import type { MicroserviceAppOptions, TransportId } from "~/interfaces/index.js";
import type { MicroserviceServer } from "~/microservices/server.js";

import { Inject, Injectable } from "@venok/core";

import { ServerFactory } from "~/microservices/server.js";
import { MICROSERVICE_APP_OPTIONS } from "~/microservices/configurable-module.js";


@Injectable()
export class MicroserviceConfig {
  private readonly transport: MicroserviceServer;
  
  constructor(@Inject(MICROSERVICE_APP_OPTIONS) private readonly options: MicroserviceAppOptions) {
    this.transport = ServerFactory.create({ strategy: this.options.transport, options: this.options.options });
  }
  
  public get transportId(): TransportId {
    return this.transport.transportId;
  }

  public getTransport() {
    return this.transport;
  }
}