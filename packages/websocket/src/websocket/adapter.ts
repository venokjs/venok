import type { VenokParamsFactoryInterface } from "@venok/core";
import type { Observable } from "rxjs";

import type { WebsocketGatewayHandlerMetadata } from "~/interfaces/websocket/gateway-handler-metadata.interfcae.js";
import type { EventStreamsHost } from "~/interfaces/index.js";

import { SocketsContainer } from "~/websocket/container.js";
import {
  VENOK_WS_ADAPTER_GET_OR_CREATE_SERVER,
  VENOK_WS_ADAPTER_BIND_CLIENT_CONNECT,
  VENOK_WS_ADAPTER_BIND_CLIENT_DISCONNECT,
  VENOK_WS_ADAPTER_BIND_MESSAGE_HANDLERS,
  VENOK_WS_ADAPTER_CREATE,
  VENOK_WS_ADAPTER_LISTEN,
} from "~/symbols.js";

export abstract class AbstractWebsocketAdapter<Server = any, Client = any, Options extends Record<string, any> = any> {
  protected socketsContainer: SocketsContainer = new SocketsContainer();
  protected mainServerApplyCallback: Function | null = null;

  public isAckSupported: boolean = false;
  public useCustomFactory: boolean = false;

  public setMainServerApplyCallback(fn: Function): void {
    this.mainServerApplyCallback = fn;
  }

  public abstract getParamsFactory(): VenokParamsFactoryInterface;
  public abstract [VENOK_WS_ADAPTER_GET_OR_CREATE_SERVER](port: number, options: any): EventStreamsHost;

  public abstract [VENOK_WS_ADAPTER_BIND_CLIENT_CONNECT](server: Server, callback: Function): void;
  public abstract [VENOK_WS_ADAPTER_BIND_CLIENT_DISCONNECT](client: Client, callback: Function): void;
  // eslint-disable-next-line @stylistic/max-len
  public abstract [VENOK_WS_ADAPTER_BIND_MESSAGE_HANDLERS](client: Client, handlers: WebsocketGatewayHandlerMetadata[], transform: (data: any) => Observable<any>): void;

  public abstract [VENOK_WS_ADAPTER_CREATE](port: number, options?: Options): Server;

  public abstract close(server: Server): Promise<void>;
  public abstract closeAll(): Promise<void>;

  public abstract [VENOK_WS_ADAPTER_LISTEN](config: { mainHttpServerPort: number }): void;
}