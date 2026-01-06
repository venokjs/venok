/* eslint-disable @typescript-eslint/no-unused-vars */
import type { MicroserviceClientOptions, ReadPacket, WritePacket } from "~/interfaces/index.js";

import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { Observable, Subject } from "rxjs";
import { randomStringGenerator } from "@venok/core";

import { MicroserviceClient, MicroserviceClientFactory } from "~/microservices/client.js";
import { InvalidPatternException } from "~/errors/invalid-pattern.exception.js";

class TestMicroserviceClient extends MicroserviceClient {
  protected serializer: any;
  protected deserializer: any;

  constructor(options?: any) {
    super();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    this.initializeSerializer(options);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    this.initializeDeserializer(options);
  }

  public async connect() {
    this._status$.next("connected");
    return Promise.resolve();
  }

  public async close() {
    this._status$.next("disconnected");
    return Promise.resolve();
  }

  public on(event: any, callback: any) {
    // Mock implementation
  }

  public unwrap<T>(): T {
    return {} as T;
  }

  protected publish(packet: ReadPacket, callback: (packet: WritePacket) => void): () => void {
    // Mock publish implementation
    setTimeout(() => {
      callback({ response: "test-response", isDisposed: true });
    }, 0);
    return () => {};
  }

  protected async dispatchEvent<T = any>(packet: ReadPacket): Promise<T> {
    // Mock dispatchEvent implementation
    return Promise.resolve("event-dispatched" as any);
  }

  protected serializeError<T = any>(err: any): T {
    return err;
  }

  protected serializeResponse<T = any>(response: any): T {
    return response;
  }
}

describe("MicroserviceClient", () => {
  let client: TestMicroserviceClient;

  beforeEach(() => {
    client = new TestMicroserviceClient();
  });

  describe("status", () => {
    it("should return observable status stream", () => {
      const status$ = client.status;
      expect(status$).toBeInstanceOf(Observable);
    });

    it("should emit status changes", (done) => {
      const status$ = client.status;
      let statusCount = 0;
      const expectedStatuses = ["connected", "disconnected"];
      
      status$.subscribe({
        next: (status) => {
          expect(status).toBe(expectedStatuses[statusCount]);
          statusCount++;
          if (statusCount === expectedStatuses.length) {
            done();
          }
        },
      });

      client.connect();
      client.close();
    });

    it("should emit distinct status changes only", (done) => {
      const status$ = client.status;
      let statusCount = 0;
      
      status$.subscribe({
        next: (status) => {
          statusCount++;
          expect(status).toBe("connected");
          if (statusCount === 1) {
            setTimeout(done, 10);
          } else {
            throw new Error("Should not emit duplicate status");
          }
        },
      });

      client.connect();
      client.connect(); // Should not emit again
    });
  });

  describe("send", () => {
    it("should return Observable", () => {
      const result = client.send({ test: 3 }, "test");
      expect(result).toBeInstanceOf(Observable);
    });

    it("should throw InvalidPatternException for null pattern", (done) => {
      const result$ = client.send(null, "test");
      
      result$.subscribe({
        error: (err) => {
          expect(err).toBeInstanceOf(InvalidPatternException);
          done();
        },
      });
    });

    it("should throw InvalidPatternException for null data", (done) => {
      const result$ = client.send({ test: 3 }, null);
      
      result$.subscribe({
        error: (err) => {
          expect(err).toBeInstanceOf(InvalidPatternException);
          done();
        },
      });
    });

    it("should throw InvalidPatternException for undefined pattern", (done) => {
      const result$ = client.send(undefined, "test");
      
      result$.subscribe({
        error: (err) => {
          expect(err).toBeInstanceOf(InvalidPatternException);
          done();
        },
      });
    });

    it("should throw InvalidPatternException for undefined data", (done) => {
      const result$ = client.send({ test: 3 }, undefined);
      
      result$.subscribe({
        error: (err) => {
          expect(err).toBeInstanceOf(InvalidPatternException);
          done();
        },
      });
    });

    it("should call connect on subscribe", () => {
      const connectSpy = spyOn(client, "connect");
      const result$ = client.send({ test: 3 }, "test");
      
      result$.subscribe();
      expect(connectSpy).toHaveBeenCalledTimes(1);
    });

    it("should call publish after connect", (done) => {
      const publishSpy = spyOn(client, "publish" as any);
      const result$ = client.send({ test: 3 }, "test");
      
      result$.subscribe({
        next: () => {
          expect(publishSpy).toHaveBeenCalledTimes(1);
          done();
        },
      });
    });

    it("should handle successful response", (done) => {
      const result$ = client.send({ test: 3 }, "test");
      
      result$.subscribe({
        next: (response) => {
          expect(response).toBe("test-response");
          done();
        },
      });
    });

    it("should handle connect error", (done) => {
      const connectError = new Error("Connect failed");
      spyOn(client, "connect").mockRejectedValue(connectError);
      
      const result$ = client.send({ test: 3 }, "test");
      
      result$.subscribe({
        error: (err) => {
          expect(err).toBe(connectError);
          done();
        },
      });
    });
  });

  describe("emit", () => {
    it("should return Observable", () => {
      const result = client.emit({ test: 3 }, "test");
      expect(result).toBeInstanceOf(Observable);
    });

    it("should throw InvalidPatternException for null pattern", (done) => {
      const result$ = client.emit(null, "test");
      
      result$.subscribe({
        error: (err) => {
          expect(err).toBeInstanceOf(InvalidPatternException);
          done();
        },
      });
    });

    it("should throw InvalidPatternException for null data", (done) => {
      const result$ = client.emit({ test: 3 }, null);
      
      result$.subscribe({
        error: (err) => {
          expect(err).toBeInstanceOf(InvalidPatternException);
          done();
        },
      });
    });

    it("should call connect immediately", () => {
      const connectSpy = spyOn(client, "connect");
      client.emit({ test: 3 }, "test");
      
      expect(connectSpy).toHaveBeenCalledTimes(1);
    });

    it("should call dispatchEvent after connect", (done) => {
      const dispatchEventSpy = spyOn(client, "dispatchEvent" as any);
      const result$ = client.emit({ test: 3 }, "test");
      
      result$.subscribe({
        next: () => {
          expect(dispatchEventSpy).toHaveBeenCalledTimes(1);
          done();
        },
      });
    });

    it("should handle successful event dispatch", (done) => {
      const result$ = client.emit({ test: 3 }, "test");
      
      result$.subscribe({
        next: (response) => {
          expect(response).toBe("event-dispatched");
          done();
        },
      });
    });

    it("should handle connect error", (done) => {
      const connectError = new Error("Connect failed");
      spyOn(client, "connect").mockRejectedValue(connectError);
      
      const result$ = client.emit({ test: 3 }, "test");
      
      result$.subscribe({
        error: (err) => {
          expect(err).toBe(connectError);
          done();
        },
      });
    });

    it("should use connectable source", () => {
      const result$ = client.emit({ test: 3 }, "test");
      // Verify it's a connectable observable by checking it has connect method
      expect(typeof (result$ as any).connect).toBe("function");
    });
  });

  describe("createObserver", () => {
    it("should call observer.error when err is provided", () => {
      const observer = {
        next: mock(() => {}),
        error: mock(() => {}),
        complete: mock(() => {}),
      };
      
      const callback = client["createObserver"](observer);
      const testError = new Error("test error");
      
      callback({ err: testError });
      
      expect(observer.error).toHaveBeenCalledWith(testError);
      expect(observer.next).not.toHaveBeenCalled();
    });

    it("should call observer.next and complete when response and isDisposed", () => {
      const observer = {
        next: mock(() => {}),
        error: mock(() => {}),
        complete: mock(() => {}),
      };
      
      const callback = client["createObserver"](observer);
      const testResponse = { data: "test" };
      
      callback({ response: testResponse, isDisposed: true });
      
      expect(observer.next).toHaveBeenCalledWith(testResponse);
      expect(observer.complete).toHaveBeenCalled();
      expect(observer.error).not.toHaveBeenCalled();
    });

    it("should call observer.complete when only isDisposed is true", () => {
      const observer = {
        next: mock(() => {}),
        error: mock(() => {}),
        complete: mock(() => {}),
      };
      
      const callback = client["createObserver"](observer);
      
      callback({ isDisposed: true });
      
      expect(observer.complete).toHaveBeenCalled();
      expect(observer.next).not.toHaveBeenCalled();
      expect(observer.error).not.toHaveBeenCalled();
    });

    it("should call observer.next for response without disposal", () => {
      const observer = {
        next: mock(() => {}),
        error: mock(() => {}),
        complete: mock(() => {}),
      };
      
      const callback = client["createObserver"](observer);
      const testResponse = { data: "test" };
      
      callback({ response: testResponse });
      
      expect(observer.next).toHaveBeenCalledWith(testResponse);
      expect(observer.complete).not.toHaveBeenCalled();
      expect(observer.error).not.toHaveBeenCalled();
    });

    it("should handle undefined response", () => {
      const observer = {
        next: mock(() => {}),
        error: mock(() => {}),
        complete: mock(() => {}),
      };
      
      const callback = client["createObserver"](observer);
      
      callback({ response: undefined });
      
      expect(observer.next).toHaveBeenCalledWith(undefined);
      expect(observer.complete).not.toHaveBeenCalled();
      expect(observer.error).not.toHaveBeenCalled();
    });
  });

  describe("assignPacketId", () => {
    it("should assign random string id to packet", () => {
      const packet: ReadPacket = { pattern: "test", data: "data" };
      const packetWithId = client["assignPacketId"](packet);
      
      expect(packetWithId).toHaveProperty("id");
      expect(typeof packetWithId.id).toBe("string");
      expect(packetWithId.id.length).toBeGreaterThan(0);
      expect(packetWithId.pattern).toBe("test");
      expect(packetWithId.data).toBe("data");
    });

    it("should assign different ids for different calls", () => {
      const packet1: ReadPacket = { pattern: "test1", data: "data1" };
      const packet2: ReadPacket = { pattern: "test2", data: "data2" };
      
      const packetWithId1 = client["assignPacketId"](packet1);
      const packetWithId2 = client["assignPacketId"](packet2);
      
      expect(packetWithId1.id).not.toBe(packetWithId2.id);
    });
  });

  describe("connect$", () => {
    it("should return observable that merges error and connect events", (done) => {
      const mockInstance = {
        on: mock((event: string, callback: Function) => {
          if (event === "connect") {
            setTimeout(() => callback("connected"), 0);
          }
        }),
        off: mock(() => {}),
        addListener: mock((event: string, callback: Function) => {
          if (event === "connect") {
            setTimeout(() => callback("connected"), 0);
          }
        }),
        removeListener: mock(() => {}),
      };
      
      const connect$ = client["connect$"](mockInstance);
      
      connect$.subscribe({
        next: (value) => {
          expect(value).toBe("connected");
          done();
        },
      });
    });

    it("should handle error event", (done) => {
      const mockInstance = {
        on: mock((event: string, callback: Function) => {
          if (event === "error") {
            setTimeout(() => callback(new Error("Connection error")), 0);
          }
        }),
        off: mock(() => {}),
        addListener: mock((event: string, callback: Function) => {
          if (event === "error") {
            setTimeout(() => callback(new Error("Connection error")), 0);
          }
        }),
        removeListener: mock(() => {}),
      };
      
      const connect$ = client["connect$"](mockInstance);
      
      connect$.subscribe({
        error: (err) => {
          expect(err.message).toBe("Connection error");
          done();
        },
      });
    });

    it("should use custom event names", (done) => {
      const mockInstance = {
        on: mock((event: string, callback: Function) => {
          if (event === "customConnect") {
            setTimeout(() => callback("custom-connected"), 0);
          }
        }),
        off: mock(() => {}),
        addListener: mock((event: string, callback: Function) => {
          if (event === "customConnect") {
            setTimeout(() => callback("custom-connected"), 0);
          }
        }),
        removeListener: mock(() => {}),
      };
      
      const connect$ = client["connect$"](mockInstance, "customError", "customConnect");
      
      connect$.subscribe({
        next: (value) => {
          expect(value).toBe("custom-connected");
          done();
        },
      });
    });

    it("should take only first event", (done) => {
      let callbackCount = 0;
      const mockInstance = {
        on: mock((event: string, callback: Function) => {
          if (event === "connect") {
            setTimeout(() => {
              callback("first");
              setTimeout(() => callback("second"), 10); // Should be ignored
            }, 0);
          }
        }),
        off: mock(() => {}),
        addListener: mock((event: string, callback: Function) => {
          if (event === "connect") {
            setTimeout(() => {
              callback("first");
              setTimeout(() => callback("second"), 10); // Should be ignored
            }, 0);
          }
        }),
        removeListener: mock(() => {}),
      };
      
      const connect$ = client["connect$"](mockInstance);
      
      connect$.subscribe({
        next: () => {
          callbackCount++;
          if (callbackCount === 1) {
            setTimeout(() => {
              expect(callbackCount).toBe(1);
              done();
            }, 50);
          }
        },
      });
    });
  });

  describe("initializeSerializer", () => {
    it("should set serializer from options", () => {
      const mockSerializer = { serialize: () => {} };
      const options = { serializer: mockSerializer };
      
      client["initializeSerializer"](options);
      
      expect(client["serializer"]).toBe(mockSerializer);
    });

    it("should handle undefined options", () => {
      client["initializeSerializer"](undefined);
      
      expect(client["serializer"]).toBeUndefined();
    });

    it("should handle options without serializer", () => {
      const options = { someOtherProp: "value" };
      
      client["initializeSerializer"](options);
      
      expect(client["serializer"]).toBeUndefined();
    });
  });

  describe("initializeDeserializer", () => {
    it("should set deserializer from options", () => {
      const mockDeserializer = { deserialize: () => {} };
      const options = { deserializer: mockDeserializer };
      
      client["initializeDeserializer"](options);
      
      expect(client["deserializer"]).toBe(mockDeserializer);
    });

    it("should handle undefined options", () => {
      client["initializeDeserializer"](undefined);
      
      expect(client["deserializer"]).toBeUndefined();
    });

    it("should handle options without deserializer", () => {
      const options = { someOtherProp: "value" };
      
      client["initializeDeserializer"](options);
      
      expect(client["deserializer"]).toBeUndefined();
    });
  });

  describe("abstract methods coverage", () => {
    it("should have connect method", () => {
      expect(typeof client.connect).toBe("function");
    });

    it("should have close method", () => {
      expect(typeof client.close).toBe("function");
    });

    it("should have on method", () => {
      expect(typeof client.on).toBe("function");
    });

    it("should have unwrap method", () => {
      expect(typeof client.unwrap).toBe("function");
    });

    it("should have publish method", () => {
      expect(typeof client["publish"]).toBe("function");
    });

    it("should have dispatchEvent method", () => {
      expect(typeof client["dispatchEvent"]).toBe("function");
    });

    it("should have serializeError method", () => {
      expect(typeof client["serializeError"]).toBe("function");
    });

    it("should have serializeResponse method", () => {
      expect(typeof client["serializeResponse"]).toBe("function");
    });
  });
});

describe("MicroserviceClientFactory", () => {
  it("should create client instance from options", () => {
    const options: MicroserviceClientOptions = {
      customClass: TestMicroserviceClient,
      options: { test: "value" },
    };
    
    const client = MicroserviceClientFactory.create(options);
    
    expect(client).toBeInstanceOf(TestMicroserviceClient);
    expect(client).toBeInstanceOf(MicroserviceClient);
  });

  it("should pass options to client constructor", () => {
    // @ts-expect-error Mismatch types
    const constructorSpy = spyOn(TestMicroserviceClient.prototype, "initializeSerializer");
    
    const options: MicroserviceClientOptions = {
      customClass: TestMicroserviceClient,
      options: { test: "value" },
    };
    
    MicroserviceClientFactory.create(options);
    
    expect(constructorSpy).toHaveBeenCalledWith({ test: "value" });
  });

  it("should create client without options", () => {
    const options: MicroserviceClientOptions = {
      customClass: TestMicroserviceClient,
    };
    
    const client = MicroserviceClientFactory.create(options);
    
    expect(client).toBeInstanceOf(TestMicroserviceClient);
  });
});