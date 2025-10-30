import { VenokBaseDiscovery } from "~/discovery/base.discovery.js";
import { RequestMethod } from "~/enums/request-method.enum.js";

type RouteDiscoveryMeta = {
  method: RequestMethod;
  path: string;
};

export class RouteDiscovery extends VenokBaseDiscovery<RouteDiscoveryMeta> {
  protected contextCallback!: Function;

  public getPath() {
    return this.meta.path;
  }

  public getMethod() {
    return this.meta.method;
  }

  public setContextCallback(fn: Function) {
    this.contextCallback ??= fn;
  }

  public getContextCallback() {
    return this.contextCallback;
  }
}
