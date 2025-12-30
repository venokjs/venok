import type { EventStreamsHost, WebsocketGatewayHandlerMetadata } from "~/interfaces/index.js";

export type WebsocketGatewayMetadata = {
  port: number;
  options: object;
  handleConnect: Function | undefined;
  handleDisconnect: Function | undefined;
  afterInit: Function | undefined;
  observableServer: EventStreamsHost;
  handlers: WebsocketGatewayHandlerMetadata[];
};