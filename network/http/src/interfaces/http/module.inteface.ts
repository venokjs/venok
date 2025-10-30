import type { VenokModule } from "@venok/core";

export interface VenokHttpModule extends VenokModule {
  configure(consumer: any): void | Promise<void>;
}
