import type { MiddlewareConsumer, VenokHttpModule } from "~/interfaces/index.js";

export abstract class HttpMiddlewareModule implements VenokHttpModule {
  abstract configure(consumer: MiddlewareConsumer): void | Promise<void>;
}
