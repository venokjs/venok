import { MiddlewareConsumer, VenokHttpModule } from "@venok/http/interfaces";

export abstract class HttpMiddlewareModule implements VenokHttpModule {
  abstract configure(consumer: MiddlewareConsumer): void | Promise<void>;
}
