import type { ArgumentsHost } from "@venok/core";

import { ExecutionContextHost } from "@venok/core";

export class WebsocketArgumentsHost extends ExecutionContextHost {
  public static create(context: ArgumentsHost): WebsocketArgumentsHost {
    const type = context.getType();
    const websocketContext = new WebsocketArgumentsHost(context.getArgs());
    websocketContext.setType(type);
    return websocketContext;
  }

  public getClient<T>(): T {
    return this.getArgByIndex(0);
  }

  public getData<T>(): T {
    return this.getArgByIndex(1);
  }

  public getPattern(): string {
    return this.getArgByIndex(this.getArgs().length - 1);
  }
}