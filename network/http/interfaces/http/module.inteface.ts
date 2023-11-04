import { VenokModule } from "@venok/core";
import { MiddlewareConsumer } from "../middleware";

export interface VenokHttpModule extends VenokModule {
  configure(consumer: MiddlewareConsumer): void;
}
