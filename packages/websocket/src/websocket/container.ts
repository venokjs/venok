import type { EventStreamsHost } from "~/interfaces/index.js";

import hash from "object-hash";

export class SocketsContainer {
  private readonly eventStreamsHosts = new Map<string | RegExp, EventStreamsHost>();

  public getAll(): Map<string | RegExp, EventStreamsHost> {
    return this.eventStreamsHosts;
  }

  public get<T extends Record<string, any> = any>(options: T): EventStreamsHost {
    const uniqueToken = this.generateHashByOptions(options);
    return this.eventStreamsHosts.get(uniqueToken)!;
  }

  public add<T extends Record<string, any> = any>(options: T, host: EventStreamsHost) {
    const uniqueToken = this.generateHashByOptions(options);
    this.eventStreamsHosts.set(uniqueToken, host);
  }

  public clear() {
    this.eventStreamsHosts.clear();
  }

  private generateHashByOptions<T extends Record<string, any> = any>(options: T): string {
    return hash(options, { ignoreUnknown: true });
  }
}