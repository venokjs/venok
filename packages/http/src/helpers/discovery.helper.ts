import type { AdapterRouteMetadata, VersionValue } from "~/interfaces/index.js";

import { HOST_METADATA, PATH_METADATA, VERSION_METADATA } from "~/constants.js";

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

export class RouteDiscovery extends VenokBaseDiscovery<AdapterRouteMetadata & { path: string }> {}

type ControllerDiscoveryMeta = {
  [PATH_METADATA]: string | string[];
  [HOST_METADATA]: string | RegExp | (string | RegExp)[] | undefined;
  [VERSION_METADATA]: VersionValue | undefined;
};

export class ControllerDiscovery extends VenokBaseDiscovery<ControllerDiscoveryMeta> {
  protected readonly items: RouteDiscovery[] = [];

  public pushItem(item: RouteDiscovery) {
    this.items.push(item);
  }

  public getItems() {
    return this.items;
  }

  public getPrefixes() {
    return this.meta[PATH_METADATA];
  }

  public getHost() {
    return this.meta[HOST_METADATA];
  }

  public getVersion() {
    return this.meta[VERSION_METADATA];
  }
}
