import type { BeforeApplicationShutdown, OnApplicationBootstrap, OnModuleInit } from "@venok/core";
import type { Subject } from "rxjs";

import type { WebsocketGatewayHandlerMetadata } from "~/interfaces/websocket/gateway-handler-metadata.interfcae.js";
import type { WebsocketGatewayMetadata } from "~/interfaces/websocket/gateway-metadata.interface.js";
import type { WebsocketAppOptions } from "~/interfaces/index.js";

import { Inject, Injectable } from "@venok/core";
import { distinctUntilChanged, isObservable, mergeAll, Observable, of } from "rxjs";
import { fromPromise } from "rxjs/internal/observable/innerFrom";

import { WebsocketExplorerService } from "~/websocket/explorer.js";
import { WebSocketGateway } from "~/decorators/gateway.decorator.js";
import { WebsocketConfig } from "~/websocket/config.js";
import { WEBSOCKET_APP_OPTIONS } from "~/websocket/configurable-module.js";
import {
  VENOK_WS_ADAPTER_BIND_CLIENT_CONNECT,
  VENOK_WS_ADAPTER_BIND_CLIENT_DISCONNECT,
  VENOK_WS_ADAPTER_BIND_MESSAGE_HANDLERS,
  VENOK_WS_ADAPTER_LISTEN
} from "~/symbols.js";


@Injectable()
export class WebsocketStarterModule implements OnApplicationBootstrap, OnModuleInit, BeforeApplicationShutdown {
  constructor(
    @Inject(WEBSOCKET_APP_OPTIONS) private readonly options: Required<WebsocketAppOptions>,
    private readonly websocketExplorerService: WebsocketExplorerService,
    private readonly websocketConfig: WebsocketConfig
  ) {}

  public onApplicationBootstrap() {
    const adapter = this.websocketConfig.getAdapter();

    adapter[VENOK_WS_ADAPTER_LISTEN]({ mainHttpServerPort: this.options.httpPort || 0 });
  }

  public async beforeApplicationShutdown() {
    const adapter = this.websocketConfig.getAdapter();

    await adapter.closeAll();
  }

  public onModuleInit() {
    this.websocketExplorerService
      .explore(WebSocketGateway.KEY)
      .forEach((gateway) => this.bindGateway(gateway));

    const adapter = this.websocketConfig.getAdapter();

    adapter.setMainServerApplyCallback(this.options.attachMainWebsocketServerToHttpServerCallback);
  }

  private bindGateway(gateway: WebsocketGatewayMetadata) {
    const adapter = this.websocketConfig.getAdapter();
    
    const { connection, disconnect, init, server } = gateway.observableServer;

    if (gateway.afterInit) init.subscribe(gateway.afterInit as (value: any) => any);
    if (gateway.handleConnect) {
      connection
        .pipe(distinctUntilChanged((prev, curr) => prev && curr && prev[0] === curr[0]))
        .subscribe(gateway.handleConnect as (value: any) => any);
    }
    if (gateway.handleDisconnect) {
      disconnect
        .pipe(distinctUntilChanged())
        .subscribe(gateway.handleDisconnect as (value: any) => any);
    }

    const handler = this.getConnectionHandler(gateway.handlers, disconnect, connection);

    adapter[VENOK_WS_ADAPTER_BIND_CLIENT_CONNECT](server, handler);
  }

  public getConnectionHandler(
    handlers: WebsocketGatewayHandlerMetadata[],
    disconnect: Subject<any>,
    connection: Subject<any>
  ) {
    const adapter = this.websocketConfig.getAdapter();

    return (...args: unknown[]) => {
      const [client] = args;
      connection.next(args);
      this.subscribeMessages(client, handlers);

      adapter[VENOK_WS_ADAPTER_BIND_CLIENT_DISCONNECT](client, (...disconnectArgs: any[]) => disconnect.next(disconnectArgs));
    };
  }

  public subscribeMessages<T = any>(client: T, handlers: WebsocketGatewayHandlerMetadata[]) {
    const adapter = this.websocketConfig.getAdapter();

    adapter[VENOK_WS_ADAPTER_BIND_MESSAGE_HANDLERS](
      client, 
      handlers, 
      data => fromPromise(this.pickResult(data as Promise<any>)).pipe(mergeAll())
    );
  }
  
  public async pickResult(deferredResult: Promise<any>): Promise<Observable<any>> {
    const result = await deferredResult;

    if (isObservable(result)) return result;
    if (result instanceof Promise) return fromPromise(result);
    return of(result);
  }
}