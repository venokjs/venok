import { VenokBaseDiscovery } from "@venok/http/discovery/base.discovery";
import { RouteDiscovery } from "@venok/http/discovery/route.discovery";
import { HOST_METADATA, PATH_METADATA, VERSION_METADATA } from "@venok/http/constants";
import { SCOPE_OPTIONS_METADATA } from "@venok/core/constants";
import { ScopeOptions } from "@venok/core";
import { VersionValue } from "@venok/http/interfaces";

type ControllerDiscoveryMeta = {
  [PATH_METADATA]: string | string[];
  [HOST_METADATA]: string | RegExp | (string | RegExp)[] | undefined;
  [SCOPE_OPTIONS_METADATA]: ScopeOptions | undefined;
  [VERSION_METADATA]: VersionValue | undefined;
};

export class ControllerDiscovery extends VenokBaseDiscovery<ControllerDiscoveryMeta> {
  protected readonly items: RouteDiscovery[] = [];

  public setItem(item: RouteDiscovery) {
    this.items.push(item);
  }

  public getItems() {
    return this.items;
  }

  public getPath() {
    return this.meta[PATH_METADATA];
  }

  public getHost() {
    return this.meta[HOST_METADATA];
  }

  public getScope() {
    return this.meta[SCOPE_OPTIONS_METADATA];
  }

  public getVersion() {
    return this.meta[VERSION_METADATA];
  }
}
