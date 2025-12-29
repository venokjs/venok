import type { EventStreamsHost } from "~/interfaces/index.js";

import { ReplaySubject, Subject } from "rxjs";

export class EventStreamsFactory {
  public static create<T = any>(server: T): EventStreamsHost<T> {
    const init = new ReplaySubject<T>();
    init.next(server);

    const connection = new Subject();
    const disconnect = new Subject();

    return { init, connection, disconnect, server };
  }
}