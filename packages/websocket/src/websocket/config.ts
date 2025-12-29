import type { AbstractWebsocketAdapter } from "~/websocket/adapter.js";
import type { WebsocketAppOptions } from "~/interfaces/index.js";

import { Inject, Injectable } from "@venok/core";

import { WEBSOCKET_APP_OPTIONS } from "~/websocket/configurable-module.js";


@Injectable()
export class WebsocketConfig<T extends AbstractWebsocketAdapter = AbstractWebsocketAdapter> {
  private adapter: T;

  constructor(@Inject(WEBSOCKET_APP_OPTIONS) private readonly options: Required<WebsocketAppOptions>) {
    this.adapter = this.options.adapter as T;
  }

  public setAdapter(websocketAdapter: T) { this.adapter = websocketAdapter; }
  public getAdapter(): T { return this.adapter; }
}