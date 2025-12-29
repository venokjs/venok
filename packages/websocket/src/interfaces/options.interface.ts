import type { AbstractWebsocketAdapter } from "~/websocket/adapter.js";

export type WebsocketAppOptions = {
  adapter: AbstractWebsocketAdapter;
  httpPort?: number;
  attachMainWebsocketServerToHttpServerCallback?: (...args: any[]) => void
};