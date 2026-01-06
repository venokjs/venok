import type { BeforeApplicationShutdown, OnApplicationBootstrap, OnModuleInit } from "@venok/core";
import type { Observable } from "rxjs";

import type { MicroserviceAppOptions, MicroserviceHandlersMetadata } from "~/interfaces/index.js";
import type { MicroserviceExplorerService } from "~/microservices/explorer.js";
import type { MicroserviceConfig } from "~/microservices/config.js";

import { Inject, Injectable, Logger } from "@venok/core";

import { Microservice } from "~/decorators/microservice.decorator.js";
import { MICROSERVICE_APP_OPTIONS } from "~/microservices/configurable-module.js";
import { MICROSERVICE_READY } from "~/helpers/messages.helper.js";

@Injectable()
export class MicroserviceStarterModule implements BeforeApplicationShutdown, OnApplicationBootstrap, OnModuleInit {
  protected readonly logger = new Logger(MicroserviceStarterModule.name, { timestamp: true });

  constructor(
    @Inject(MICROSERVICE_APP_OPTIONS) private readonly options: Required<MicroserviceAppOptions>,
    private readonly microserviceExplorerService: MicroserviceExplorerService,
    private readonly microserviceConfig: MicroserviceConfig
  ) {}

  public onApplicationBootstrap() {
    const transport = this.microserviceConfig.getTransport();
    return new Promise<any>((resolve, reject) => {
      transport.listen((err, info) => {
        if (err) return reject(err as Error);

        this.logger.log(MICROSERVICE_READY);
        resolve(info);
      });
    });
  }

  public async beforeApplicationShutdown() {
    const transport = this.microserviceConfig.getTransport();

    await transport.close();
  }

  public onModuleInit() {
    const transport = this.microserviceConfig.getTransport();
    transport.setTransportId(this.options.transportId);

    this.microserviceExplorerService
      .explore(Microservice.KEY)
      .forEach((microservice) => this.bindMicroservice(microservice));
  }

  public bindMicroservice(microservice: MicroserviceHandlersMetadata) {
    const transport = this.microserviceConfig.getTransport();

    microservice.handlers.map(handler => transport.addHandler(
      handler.pattern,
      handler.callback as (data: any, ctx?: any) => Promise<Observable<any>> | Promise<any>,
      handler.isEventHandler,
      handler.extras
    ));
  }
}