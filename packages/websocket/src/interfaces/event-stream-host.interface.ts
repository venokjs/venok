import { ReplaySubject, Subject } from "rxjs";

/**
 * @publicApi
 */
export interface EventStreamsHost<T = any> {
  server: T;
  init: ReplaySubject<T>;
  connection: Subject<any>;
  disconnect: Subject<any>;
}