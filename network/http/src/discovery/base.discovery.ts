import { Reflector } from "@venok/core";

interface DiscoveredItem {
  class: any;
  handler?: (...args: any[]) => any;
}

export abstract class VenokBaseDiscovery<T = any> {
  protected readonly = new Reflector();

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
