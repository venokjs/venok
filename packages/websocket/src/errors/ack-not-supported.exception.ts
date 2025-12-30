import { RuntimeException } from "@venok/core";

export class AckNotSupportedException extends RuntimeException {
  constructor(type: any, pattern: string) {
    super(`Ack don't supported with your adapter. Remove @Ack decorator from gateway (${type}) handler with pattern: (${pattern})`);
  }
}