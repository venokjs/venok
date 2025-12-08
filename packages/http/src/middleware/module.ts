import type { VenokModule } from "@venok/core";

import type { HttpMiddlewareConsumer } from "~/interfaces/index.js";

export abstract class HttpMiddlewareModule implements VenokModule {
  abstract configure(consumer: HttpMiddlewareConsumer): void | Promise<void>;
}
