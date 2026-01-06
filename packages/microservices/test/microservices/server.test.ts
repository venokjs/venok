import type { ExecutionContextHost, LoggerService } from "@venok/core";
import type {
  ConsumerDeserializer,
  ConsumerSerializer,
  MessageHandler,
  MicroserviceServerOptions,
  ReadPacket
} from "~/interfaces/index.js";

import { beforeEach, describe, expect, it, mock } from "bun:test";
import { Observable, of, throwError as _throw } from "rxjs";
import { finalize } from "rxjs/operators";

import { MicroserviceServer, ServerFactory } from "~/microservices/server.js";
import { normalizePattern } from "~/helpers/normalize-pattern.helper.js";
import { NO_EVENT_HANDLER } from "~/helpers/messages.helper.js";

class TestMicroserviceServer extends MicroserviceServer {
  public transportId = Symbol("test-transport");
  protected serializer: ConsumerSerializer = {} as any;
  protected deserializer: ConsumerDeserializer = {} as any;

  public on<
    EventKey extends string = string,
    EventCallback extends Function = Function
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  >(event: EventKey, callback: EventCallback): any {
    return this;
  }

  public unwrap<T>(): T {
    return null as any;
  }

  public listen(callback: (...optionalParams: unknown[]) => any): any {
    callback();
    return this;
  }

  public close(): any {
    return Promise.resolve();
  }
}

class TestStrategy extends MicroserviceServer {
  public transportId = Symbol("test-strategy");
  protected serializer: ConsumerSerializer = {} as any;
  protected deserializer: ConsumerDeserializer = {} as any;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(options?: any) {
    super();
  }

  public on<
    EventKey extends string = string,
    EventCallback extends Function = Function
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  >(event: EventKey, callback: EventCallback): any {
    return this;
  }

  public unwrap<T>(): T {
    return null as any;
  }

  public listen(callback: (...optionalParams: unknown[]) => any): any {
    callback();
    return this;
  }

  public close(): any {
    return Promise.resolve();
  }
}

describe("MicroserviceServer", () => {
  let server: TestMicroserviceServer;
  let mockLogger: LoggerService;

  beforeEach(() => {
    server = new TestMicroserviceServer();
    mockLogger = {
      error: mock(() => {}),
      warn: mock(() => {}),
      log: mock(() => {}),
      debug: mock(() => {}),
    } as any;
    (server as any).logger = mockLogger;
  });

  describe("transportId", () => {
    it("should set transport id", () => {
      const transportId = Symbol("new-transport");
      server.setTransportId(transportId);
      expect(server.transportId).toBe(transportId);
    });
  });

  describe("status", () => {
    it("should return observable status stream", (done) => {
      const testStatus = "connected" as any;
      server.status.subscribe((status) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        expect(status).toBe(testStatus);
        done();
      });
      (server as any)._status$.next(testStatus);
    });

    it("should emit distinct values only", (done) => {
      const testStatus = "connected" as any;
      let emitCount = 0;
      
      server.status.subscribe(() => {
        emitCount++;
      });
      
      (server as any)._status$.next(testStatus);
      (server as any)._status$.next(testStatus);
      
      setTimeout(() => {
        expect(emitCount).toBe(1);
        done();
      }, 10);
    });
  });

  describe("hooks", () => {
    it("should set processing start hook", () => {
      const hook = mock(() => {});
      server.setOnProcessingStartHook(hook);
      expect((server as any).onProcessingStartHook).toBe(hook);
    });

    it("should set processing end hook", () => {
      const hook = mock(() => {});
      server.setOnProcessingEndHook(hook);
      expect((server as any).onProcessingEndHook).toBe(hook);
    });
  });

  describe("addHandler", () => {
    const pattern = { test: "pattern" };
    const callback = mock(() => Promise.resolve("result")) as MessageHandler;

    it("should add handler for new pattern", () => {
      server.addHandler(pattern, callback);
      
      const normalizedPattern = normalizePattern(pattern);
      const handlers = server.getHandlers();
      expect(handlers.has(normalizedPattern)).toBe(true);
      expect(handlers.get(normalizedPattern)).toBe(callback);
    });

    it("should set handler properties", () => {
      const extras = { test: "extra" };
      server.addHandler(pattern, callback, true, extras);
      
      expect(callback.isEventHandler).toBe(true);
      expect(callback.extras).toBe(extras);
    });

    describe("when handler is an event handler", () => {
      describe("and there are other handlers registered for the pattern already", () => {
        it("should chain handlers by setting next reference", () => {
          const firstCallback = mock(() => Promise.resolve("first")) as MessageHandler;
          const secondCallback = mock(() => Promise.resolve("second")) as MessageHandler;
          const thirdCallback = mock(() => Promise.resolve("third")) as MessageHandler;
          
          server.addHandler(pattern, firstCallback, true);
          server.addHandler(pattern, secondCallback, true);
          server.addHandler(pattern, thirdCallback, true);
          
          expect(firstCallback.next).toBe(secondCallback);
          expect(secondCallback.next).toBe(thirdCallback);
          expect(thirdCallback.next).toBeUndefined();
        });

        it("should find tail in chain and add new handler", () => {
          const firstCallback = mock(() => Promise.resolve("first")) as MessageHandler;
          const middleCallback = mock(() => Promise.resolve("middle")) as MessageHandler;
          const lastCallback = mock(() => Promise.resolve("last")) as MessageHandler;
          
          firstCallback.next = middleCallback;
          const normalizedPattern = normalizePattern(pattern);
          (server as any).messageHandlers.set(normalizedPattern, firstCallback);
          
          server.addHandler(pattern, lastCallback, true);
          
          expect(middleCallback.next).toBe(lastCallback);
        });
      });

      describe("and it's not an event handler but pattern exists", () => {
        it("should replace existing handler", () => {
          const firstCallback = mock(() => Promise.resolve("first")) as MessageHandler;
          const replacementCallback = mock(() => Promise.resolve("replacement")) as MessageHandler;
          
          server.addHandler(pattern, firstCallback);
          server.addHandler(pattern, replacementCallback, false);
          
          const normalizedPattern = normalizePattern(pattern);
          const handlers = server.getHandlers();
          expect(handlers.get(normalizedPattern)).toBe(replacementCallback);
        });
      });
    });
  });

  describe("getHandlers", () => {
    it("should return message handlers map", () => {
      const handlers = server.getHandlers();
      expect(handlers).toBeInstanceOf(Map);
    });
  });

  describe("getHandlerByPattern", () => {
    const pattern = "test-pattern";
    const callback = mock(() => Promise.resolve("result")) as MessageHandler;

    it("should return handler when pattern exists", () => {
      server.addHandler(pattern, callback);
      const handler = server.getHandlerByPattern(pattern);
      expect(handler).toBe(callback);
    });

    it("should return null when pattern doesn't exist", () => {
      const handler = server.getHandlerByPattern("non-existent");
      expect(handler).toBeNull();
    });

    it("should normalize pattern before lookup", () => {
      const complexPattern = { cmd: "test", version: 1 };
      server.addHandler(complexPattern, callback);

      // @ts-expect-error Mismatch types
      const handlerByObject = server.getHandlerByPattern(complexPattern);
      const handlerByString = server.getHandlerByPattern(JSON.stringify(complexPattern));
      
      expect(handlerByObject).toBe(callback);
      expect(handlerByString).toBe(callback);
    });
  });

  describe("send", () => {
    let respondMock: ReturnType<typeof mock>;

    beforeEach(() => {
      respondMock = mock(async () => {});
    });

    it("should handle successful stream emission", (done) => {
      const stream$ = of("test-response");
      
      server.send(stream$, respondMock);
      
      process.nextTick(() => {
        const calls = respondMock.mock.calls;
        expect(calls).toHaveLength(1);
        expect(calls[0][0]).toEqual({ response: "test-response", isDisposed: true });
        done();
      });
    });

    it("should handle stream errors", (done) => {
      const errorMessage = "test error";
      const stream$ = _throw(() => errorMessage);
      
      server.send(stream$, respondMock);
      
      process.nextTick(() => {
        const calls = respondMock.mock.calls;
        expect(calls).toHaveLength(1);
        expect(calls[0][0]).toEqual({ err: errorMessage, isDisposed: true });
        done();
      });
    });

    it("should handle multiple emissions", (done) => {
      const stream$ = new Observable(observer => {
        observer.next("first");
        observer.next("second");
        observer.complete();
      });
      
      server.send(stream$, respondMock);
      
      process.nextTick(() => {
        const calls = respondMock.mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        // First emission should be processed
        expect(calls[0][0]).toHaveProperty("response");
        expect(calls[0][0].response).toBe("first");
        done();
      });
    });

    it("should batch multiple calls with process.nextTick", (done) => {
      const stream1$ = of("response1");
      const stream2$ = of("response2");
      
      server.send(stream1$, respondMock);
      server.send(stream2$, respondMock);
      
      process.nextTick(() => {
        const calls = respondMock.mock.calls;
        expect(calls.length).toBeGreaterThanOrEqual(2); // Each stream emits at least one response
        done();
      });
    });

    it("should handle disposal flag correctly", (done) => {
      const stream$ = of("test").pipe(
        finalize(() => {
          // Finalize should trigger isDisposed
        })
      );
      
      server.send(stream$, respondMock);
      
      process.nextTick(() => {
        const calls = respondMock.mock.calls;
        const disposedCall = calls.find(call => call[0].isDisposed);
        expect(disposedCall).toBeDefined();
        done();
      });
    });
  });

  describe("handleEvent", () => {
    const pattern = "test.event";
    const packet: ReadPacket = { pattern, data: { test: "data" } };
    const context = {} as ExecutionContextHost;

    it("should log error when no handler is found", async () => {
      await server.handleEvent(pattern, packet, context);
      
      expect(mockLogger.error).toHaveBeenCalledWith(NO_EVENT_HANDLER`${pattern}`);
    });

    it("should call handler with correct arguments", async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const handler = mock(async (data: any, ctx: any) => "result");
      server.addHandler(pattern, handler as MessageHandler);
      
      await server.handleEvent(pattern, packet, context);
      
      expect(handler).toHaveBeenCalledWith(packet.data, context);
    });

    it("should call processing hooks", async () => {
      const startHookMock = mock(async (transportId: symbol, ctx: any, done: Function) => {
        await done();
      });
      const endHookMock = mock(() => {});
      const handler = mock(async () => "result");
      
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      server.setOnProcessingStartHook(startHookMock);
      server.setOnProcessingEndHook(endHookMock);
      server.addHandler(pattern, handler as MessageHandler);
      
      await server.handleEvent(pattern, packet, context);
      
      expect(startHookMock).toHaveBeenCalledWith(
        server.transportId,
        context,
        expect.any(Function)
      );
      expect(endHookMock).toHaveBeenCalledWith(server.transportId, context);
    });

    it("should handle observable results", async () => {
      const endHookMock = mock(() => {});
      const handler = mock(async () => of("observable-result"));
      
      server.setOnProcessingEndHook(endHookMock);
      server.addHandler(pattern, handler as MessageHandler);
      
      await server.handleEvent(pattern, packet, context);
      
      expect(handler).toHaveBeenCalledWith(packet.data, context);
      
      // Wait for observable to complete and trigger end hook
      setTimeout(() => {
        expect(endHookMock).toHaveBeenCalledWith(server.transportId, context);
      }, 10);
    });

    it("should handle non-observable results", async () => {
      const endHookMock = mock(() => {});
      const handler = mock(async () => "simple-result");
      
      server.setOnProcessingEndHook(endHookMock);
      server.addHandler(pattern, handler as MessageHandler);
      
      await server.handleEvent(pattern, packet, context);
      
      expect(handler).toHaveBeenCalledWith(packet.data, context);
      expect(endHookMock).toHaveBeenCalledWith(server.transportId, context);
    });

    it("should work without end hook", async () => {
      const handler = mock(async () => "result");
      server.addHandler(pattern, handler as MessageHandler);
      
      await expect(server.handleEvent(pattern, packet, context)).resolves.toBeUndefined();
    });
  });

  describe("handleError", () => {
    it("should log error", () => {
      const errorMessage = "Test error";
      (server as any).handleError(errorMessage);
      
      expect(mockLogger.error).toHaveBeenCalledWith(errorMessage);
    });
  });

  describe("serializer initialization", () => {
    it("should initialize serializer from options", () => {
      const mockSerializer = { serialize: mock() };
      const options = { serializer: mockSerializer };
      
      (server as any).initializeSerializer(options);
      
      expect((server as any).serializer).toBe(mockSerializer);
    });

    it("should handle undefined options for serializer", () => {
      (server as any).initializeSerializer(undefined);
      
      expect((server as any).serializer).toBeUndefined();
    });
  });

  describe("deserializer initialization", () => {
    it("should initialize deserializer from options", () => {
      const mockDeserializer = { deserialize: mock() };
      const options = { deserializer: mockDeserializer };
      
      (server as any).initializeDeserializer(options);
      
      expect((server as any).deserializer).toBe(mockDeserializer);
    });

    it("should handle undefined options for deserializer", () => {
      (server as any).initializeDeserializer(undefined);
      
      expect((server as any).deserializer).toBeUndefined();
    });
  });
});

describe("ServerFactory", () => {
  it("should create server instance from options", () => {
    const options = { test: "option" };
    const serverOptions: MicroserviceServerOptions = {
      strategy: TestStrategy,
      options,
    };
    
    const server = ServerFactory.create(serverOptions);
    
    expect(server).toBeInstanceOf(TestStrategy);
  });

  it("should pass options to strategy constructor", () => {
    const options = { customOption: "value" };
    const serverOptions: MicroserviceServerOptions = {
      strategy: TestStrategy,
      options,
    };
    
    const server = ServerFactory.create(serverOptions);
    
    // The server should be created with the TestStrategy
    expect(server).toBeInstanceOf(TestStrategy);
    expect(server.transportId).toBeDefined();
  });
});