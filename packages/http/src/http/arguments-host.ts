import type { ArgumentsHost } from "@venok/core";

import { ExecutionContextHost } from "@venok/core";

export class HttpArgumentsHost extends ExecutionContextHost {
  public static create(context: ArgumentsHost): HttpArgumentsHost {
    const type = context.getType();
    const websocketContext = new HttpArgumentsHost(context.getArgs());
    websocketContext.setType(type);
    return websocketContext;
  }

  public getContext<T>(): T {
    return this.getArgByIndex(0);
  }
}