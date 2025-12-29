import { RuntimeException } from "@venok/core";

export class InvalidSocketPortException extends RuntimeException {
  constructor(port: number | string, type: any) {
    super(`Invalid port (${port}) in gateway ${type}`);
  }
}