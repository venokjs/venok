import type { ExecutionContextHost, LoggerService } from "@venok/core";
import type {
  ConsumerDeserializer,
  ConsumerSerializer,
  MessageHandler,
  MicroservicePattern,
  MicroserviceServerOptions, ProcessingStartHook,
  ReadPacket,
  WritePacket
} from "~/interfaces/index.js";

import { Logger } from "@venok/core";
import { connectable, EMPTY, isObservable, Observable, ReplaySubject, Subject, Subscription } from "rxjs";
import { catchError, distinctUntilChanged, finalize } from "rxjs/operators";
import { normalizePattern } from "~/helpers/normalize-pattern.helper.js";
import { NO_EVENT_HANDLER } from "~/helpers/messages.helper.js";


/**
 * @publicApi
 */
export abstract class MicroserviceServer<
  // @ts-expect-error Mismatch types
  ServerContext extends ExecutionContextHost = unknown,
  EventsMap extends Record<string, Function> = Record<string, Function>,
  Status extends string = string
> {
  /**
   * Unique transport identifier.
   */
  public abstract transportId: symbol;

  protected readonly messageHandlers = new Map<string, MessageHandler>();
  protected readonly logger: LoggerService = new Logger(MicroserviceServer.name);
  protected abstract serializer: ConsumerSerializer;
  protected abstract deserializer: ConsumerDeserializer;
  // @ts-expect-error Mismatch types
  protected onProcessingStartHook: ProcessingStartHook = (
    transportId: symbol,
    context: ServerContext,
    done: () => Promise<any>
  ) => done();
  protected onProcessingEndHook: ((
    transportId: symbol,
    context: ServerContext
  ) => void) | undefined;
  protected _status$ = new ReplaySubject<Status>(1);

  /**
   * Returns an observable that emits status changes.
   */
  public get status(): Observable<Status> {
    return this._status$.asObservable().pipe(distinctUntilChanged());
  }

  /**
   * Registers an event listener for the given event.
   * @param event Event name
   * @param callback Callback to be executed when the event is emitted
   */
  public abstract on<
    EventKey extends keyof EventsMap = keyof EventsMap,
    EventCallback extends EventsMap[EventKey] = EventsMap[EventKey]
  >(event: EventKey, callback: EventCallback): any;

  /**
   * Returns an instance of the underlying server/broker instance,
   * or a group of servers if there are more than one.
   */
  public abstract unwrap<T>(): T;

  /**
   * Method called when server is being initialized.
   * @param callback Function to be called upon initialization
   */
  public abstract listen(callback: (...optionalParams: unknown[]) => any): any;

  /**
   * Method called when server is being terminated.
   */
  public abstract close(): any;

  /**
   * Sets the transport identifier.
   * @param transportId Unique transport identifier.
   */
  public setTransportId(transportId: symbol): void {
    this.transportId = transportId;
  }

  /**
   * Sets a hook that will be called when processing starts.
   */
  public setOnProcessingStartHook(
    hook: (
      transportId: symbol,
      context: unknown,
      done: () => Promise<any>
    ) => void
  ): void {
    this.onProcessingStartHook = hook;
  }

  /**
   * Sets a hook that will be called when processing ends.
   */
  public setOnProcessingEndHook(hook: (transportId: symbol, context: unknown) => void): void {
    this.onProcessingEndHook = hook;
  }

  public addHandler(
    pattern: MicroservicePattern,
    callback: MessageHandler,
    isEventHandler = false,
    extras: Record<string, any> = {}
  ) {
    const normalizedPattern = normalizePattern(pattern);
    callback.isEventHandler = isEventHandler;
    callback.extras = extras;

    if (this.messageHandlers.has(normalizedPattern) && isEventHandler) {
      const headRef = this.messageHandlers.get(normalizedPattern)!;
      const getTail = (handler: MessageHandler): MessageHandler => handler?.next ? getTail(handler.next) : handler;

      const tailRef = getTail(headRef);
      tailRef.next = callback;
    } else {
      this.messageHandlers.set(normalizedPattern, callback);
    }
  }

  public getHandlers(): Map<string, MessageHandler> {
    return this.messageHandlers;
  }

  public getHandlerByPattern(pattern: string): MessageHandler | null {
    const route = normalizePattern(pattern);
    return this.messageHandlers.has(route)
      ? this.messageHandlers.get(route)!
      : null;
  }

  public send(
    stream$: Observable<any>,
    respond: (data: WritePacket) => Promise<unknown> | void
  ): Subscription {
    const dataQueue: WritePacket[] = [];
    let isProcessing = false;
    const scheduleOnNextTick = (data: WritePacket) => {
      if (data.isDisposed && dataQueue.length > 0) dataQueue[dataQueue.length - 1].isDisposed = true;
      else dataQueue.push(data);
      
      if (!isProcessing) {
        isProcessing = true;
        process.nextTick(async () => {
          while (dataQueue.length > 0) {
            const packet = dataQueue.shift();
            if (packet) await respond(packet);
          }
          isProcessing = false;
        });
      }
    };
    return stream$
      .pipe(
        catchError((err: any) => {
          scheduleOnNextTick({ err });
          return EMPTY;
        }),
        finalize(() => scheduleOnNextTick({ isDisposed: true }))
      )
      .subscribe((response: any) => scheduleOnNextTick({ response }));
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async handleEvent(
    pattern: string,
    packet: ReadPacket,
    context: ServerContext
  ): Promise<any> {
    const handler = this.getHandlerByPattern(pattern);
    if (!handler) return this.logger.error(NO_EVENT_HANDLER`${pattern}`);

    return this.onProcessingStartHook(this.transportId, context, async () => {
      const resultOrStream = await handler(packet.data, context);
      if (isObservable(resultOrStream)) {
        const connectableSource = connectable(
          resultOrStream.pipe(finalize(() => this.onProcessingEndHook?.(this.transportId, context))),
          {
            connector: () => new Subject(),
            resetOnDisconnect: false,
          }
        );
        connectableSource.connect();
      } else {
        this.onProcessingEndHook?.(this.transportId, context);
      }
    });
  }

  protected handleError(error: string) {
    this.logger.error(error);
  }

  protected initializeSerializer(options: MicroserviceServerOptions["options"]) {
    this.serializer = options && (options).serializer;
  }

  protected initializeDeserializer(options: MicroserviceServerOptions["options"]) {
    this.deserializer = options! && (options).deserializer;
  }
}

export class ServerFactory {
  public static create(serverOptions: MicroserviceServerOptions) {
    const { strategy, options } = serverOptions;
    return new strategy(options);
  }
}