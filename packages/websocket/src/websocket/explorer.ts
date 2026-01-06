import type { InstanceWrapper, VenokParamsFactoryInterface } from "@venok/core";
import type { ExplorerSettings } from "@venok/integration";

import type { WebsocketGatewayHandlerMetadata } from "~/interfaces/websocket/gateway-handler-metadata.interfcae.js";
import type { WebsocketGatewayMetadata } from "~/interfaces/websocket/gateway-metadata.interface.js";

import { Inject, isFunction, isUndefined, Logger, MetadataScanner } from "@venok/core";
import { ExplorerService } from "@venok/integration";

import { GATEWAY_SERVER_METADATA, MESSAGE_METADATA } from "~/constants.js";
import { WebsocketGatewayDiscovery } from "~/helpers/discovery.helper.js";
import { WebsocketContextCreator } from "~/websocket/context.js";
import { WsParamsFactory } from "~/websocket/params-factory.js";
import { WebsocketConfig } from "~/websocket/config.js";
import { GatewayFinder } from "~/websocket/finder.js";
import { InvalidSocketPortException } from "~/errors/invalid-socket-port.exception.js";
import { AckNotSupportedException } from "~/errors/ack-not-supported.exception.js";
import { WebsocketExceptionFiltersContext } from "~/filters/context.js";
import { VENOK_WS_ADAPTER_GET_OR_CREATE_SERVER } from "~/symbols.js";


export class WebsocketExplorerService extends ExplorerService<WebsocketGatewayMetadata> {
  private readonly logger = new Logger(WebsocketExplorerService.name, { timestamp: true });

  @Inject(WebsocketConfig)
  private websocketConfig!: WebsocketConfig;

  private patternFinder: GatewayFinder = new GatewayFinder(new MetadataScanner());

  protected paramsFactory!: VenokParamsFactoryInterface<unknown>;

  public onModuleInit() {
    const adapter = this.websocketConfig.getAdapter();
    this.paramsFactory = adapter.useCustomFactory ? adapter.getParamsFactory() : new WsParamsFactory();
  }

  protected getSettings(): ExplorerSettings {
    return {
      contextType: "websocket",
      isRequestScopeSupported: false,
      exceptionsFilterClass: WebsocketExceptionFiltersContext,
      contextCreatorClass: WebsocketContextCreator,
      options: { guards: true, interceptors: true, filters: false },
    };
  }

  protected filterProperties(wrapper: InstanceWrapper, metadataKey: string) {
    if (!wrapper.metatype) return;

    const gateway = this.get<WebsocketGatewayDiscovery>(metadataKey, wrapper.metatype);
    if (!gateway) return;

    const port = gateway.getPort();
    const options = gateway.getOptions();
    if (!Number.isInteger(port) || port < 0) throw new InvalidSocketPortException(port, wrapper.metatype);
    
    this.logGateway(wrapper.instance as object, port);

    const handlers = this.patternFinder
      .getGatewayHandlers(wrapper.instance as object)
      .map(handler => ({ ...handler, callback: this.createCallback(wrapper, handler.methodName) }));

    if (!handlers.length) return;

    const adapter = this.websocketConfig.getAdapter();
    if (!adapter.isAckSupported && handlers.some(metadata => metadata.isAckHandledManually)) {
      const metadata = handlers.find(metadata => metadata.isAckHandledManually)!;
      throw new AckNotSupportedException(wrapper.metatype, metadata.pattern);
    }

    let handleConnect = wrapper.instance.handleConnect as Function | undefined;
    if (handleConnect) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      Reflect.defineMetadata(MESSAGE_METADATA, "connect", wrapper.instance["handleConnect"]);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      handleConnect = (rxjsArgs: any[]) => this.createCallback(wrapper, "handleConnect")(...rxjsArgs);
    }

    let handleDisconnect = wrapper.instance.handleConnection as Function | undefined;
    if (handleDisconnect) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      Reflect.defineMetadata(MESSAGE_METADATA, "disconnect", wrapper.instance["handleDisconnect"]);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      handleDisconnect = (rxjsArgs: any[]) => this.createCallback(wrapper, "handleDisconnect")(...rxjsArgs);
    }
    
    const afterInit = wrapper.instance.afterInit as Function | undefined;

    const observableServer = adapter[VENOK_WS_ADAPTER_GET_OR_CREATE_SERVER](port, options);

    this.assignServerToProperties(wrapper.instance as object, observableServer.server as object);
    this.logHandler(wrapper.instance as object, port, handlers);

    return {
      port: port,
      options: options,
      handleConnect: handleConnect,
      handleDisconnect: handleDisconnect,
      afterInit: afterInit,
      observableServer,
      handlers: handlers,
    };
  }
  
  private assignServerToProperties(instance: object, server: object) {
    for (const propertyKey in instance) {
      if (isFunction(propertyKey)) continue;

      const property = String(propertyKey);
      const isServer = Reflect.getMetadata(GATEWAY_SERVER_METADATA, instance, property);

      if (!isUndefined(isServer)) Reflect.set(instance, propertyKey, server);
    }
  }

  private logGateway(instance: object, port: number) {
    const gatewayClassName = instance?.constructor?.name;
    if (!gatewayClassName) return;
    
    this.logger.log(`${gatewayClassName} {${port}}:`);
  }
  
  private logHandler(instance: object, port: number, handlers: WebsocketGatewayHandlerMetadata[]) {
    const gatewayClassName = instance?.constructor?.name;
    if (!gatewayClassName) return;

    handlers.forEach(({ pattern }) =>
      this.logger.log(`Mapped {${gatewayClassName}:${port}, ${pattern}} handler`)
    );
  }
}