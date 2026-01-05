import type { Observer } from "rxjs";

import type {
  MicroserviceClientOptions,
  PacketId,
  ProducerDeserializer,
  ProducerSerializer,
  ReadPacket,
  WritePacket
} from "~/interfaces/index.js";

import { connectable, defer, fromEvent, merge, Observable, ReplaySubject, Subject, throwError as _throw } from "rxjs";
import { distinctUntilChanged, map, mergeMap, take } from "rxjs/operators";
import { isNull, randomStringGenerator } from "@venok/core";

import { InvalidPatternException } from "~/errors/invalid-pattern.exception.js";


/**
 * @publicApi
 */
export abstract class MicroserviceClient<
  EventsMap extends Record<never, Function> = Record<never, Function>,
  Status extends string = string
> {
  protected routingMap = new Map<string, Function>();
  protected abstract serializer: ProducerSerializer;
  protected abstract deserializer: ProducerDeserializer;
  protected _status$ = new ReplaySubject<Status>(1);

  /**
   * Returns an observable that emits status changes.
   */
  public get status(): Observable<Status> {
    return this._status$.asObservable().pipe(distinctUntilChanged());
  }

  /**
   * Establishes the connection to the underlying server/broker.
   */
  public abstract connect(): Promise<any>;

  /**
   * Closes the underlying connection to the server/broker.
   */
  public abstract close(): any;

  /**
   * Registers an event listener for the given event.
   * @param event Event name
   * @param callback Callback to be executed when the event is emitted
   */
  public abstract on<
    EventKey extends keyof EventsMap = keyof EventsMap,
    EventCallback extends EventsMap[EventKey] = EventsMap[EventKey]
  >(event: EventKey, callback: EventCallback): void;

  /**
   * Returns an instance of the underlying server/broker instance,
   * or a group of servers if there are more than one.
   */
  public abstract unwrap<T>(): T;

  /**
   * Send a message to the server/broker.
   * Used for message-driven communication style between microservices.
   * @param pattern Pattern to identify the message
   * @param data Data to be sent
   * @returns Observable with the result
   */
  public send<TResult = any, TInput = any>(pattern: any, data: TInput): Observable<TResult> {
    if (isNull(pattern) || isNull(data)) return _throw(() => new InvalidPatternException());
    
    return defer(async () => this.connect()).pipe(
      mergeMap(
        () =>
          new Observable((observer: Observer<TResult>) => {
            const callback = this.createObserver(observer);
            return this.publish({ pattern, data }, callback);
          })
      )
    );
  }

  /**
   * Emits an event to the server/broker.
   * Used for event-driven communication style between microservices.
   * @param pattern Pattern to identify the event
   * @param data Data to be sent
   * @returns Observable that completes when the event is successfully emitted
   */
  public emit<TResult = any, TInput = any>(pattern: any, data: TInput): Observable<TResult> {
    if (isNull(pattern) || isNull(data)) return _throw(() => new InvalidPatternException());
    
    const source = defer(
      async () => this.connect()).pipe(mergeMap(() => this.dispatchEvent({ pattern, data }))
    );
    const connectableSource = connectable(source, {
      connector: () => new Subject(),
      resetOnDisconnect: false,
    });
    connectableSource.connect();
    return connectableSource;
  }

  protected abstract publish(packet: ReadPacket, callback: (packet: WritePacket) => void): () => void;

  protected abstract dispatchEvent<T = any>(packet: ReadPacket): Promise<T>;

  protected createObserver<T>(observer: Observer<T>): (packet: WritePacket) => void {
    return ({ err, response, isDisposed }: WritePacket) => {
      if (err) {
        return observer.error(this.serializeError(err));
      } else if (response !== undefined && isDisposed) {
        observer.next(this.serializeResponse(response));
        return observer.complete();
      } else if (isDisposed) {
        return observer.complete();
      }
      observer.next(this.serializeResponse(response));
    };
  }

  protected abstract serializeError<T = any>(err: any): T;

  protected abstract serializeResponse<T = any>(response: any): T;

  protected assignPacketId(packet: ReadPacket): ReadPacket & PacketId {
    const id = randomStringGenerator();
    return Object.assign(packet, { id });
  }

  protected connect$(
    instance: any,
    errorEvent = "error",
    connectEvent = "connect"
  ): Observable<any> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const error$ = fromEvent(instance, errorEvent).pipe(
      map((err: any) => {
        throw err;
      })
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const connect$ = fromEvent(instance, connectEvent);
    return merge(error$, connect$).pipe(take(1));
  }

  protected initializeSerializer(options: MicroserviceClientOptions["options"]) {
    this.serializer = options && options.serializer;
  }

  protected initializeDeserializer(options: MicroserviceClientOptions["options"]) {
    this.deserializer = options && options.deserializer;
  }
}

/**
 * @publicApi
 */
export class MicroserviceClientFactory {
  public static create(clientOptions: MicroserviceClientOptions): MicroserviceClient {
    const { customClass, options } = clientOptions;
    return new customClass(options);
  }
}