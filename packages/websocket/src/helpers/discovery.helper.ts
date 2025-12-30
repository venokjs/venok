import type { GatewayDefaultOptions } from "~/interfaces/index.js";

import { GATEWAY_OPTIONS, PORT_METADATA } from "~/constants.js";

type DiscoveredItem = {
  class: any;
  handler?: (...args: any[]) => any;
};

export abstract class VenokBaseDiscovery<T = any> {
  protected discovery!: DiscoveredItem;

  public constructor(protected readonly meta: T) {}

  public getClass() {
    return this.discovery.class;
  }

  public getHandler() {
    return this.discovery.handler;
  }

  public setDiscovery(discovery: DiscoveredItem) {
    this.discovery ??= discovery;
  }

  public getMeta() {
    return this.meta;
  }
}

export type WebsocketGatewayDiscoveryMeta<T extends GatewayDefaultOptions = GatewayDefaultOptions> = {
  [PORT_METADATA]: number;
  [GATEWAY_OPTIONS]: T
};

export class WebsocketGatewayDiscovery extends VenokBaseDiscovery<WebsocketGatewayDiscoveryMeta> {
  public getPort() {
    return this.meta[PORT_METADATA];
  }

  public getOptions() {
    return this.meta[GATEWAY_OPTIONS];
  }
}
