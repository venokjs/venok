import { describe, expect, it } from "bun:test";
import { ReplaySubject, Subject } from "rxjs";

import { EventStreamsFactory } from "~/helpers/event-stream-factory.helper.js";

describe("EventStreamsFactory", () => {
  describe("create", () => {
    it("should create event streams host with provided server", () => {
      const mockServer = { id: "test-server", port: 3000 };
      
      const result = EventStreamsFactory.create(mockServer);
      
      expect(result.server).toBe(mockServer);
      expect(result.init).toBeInstanceOf(ReplaySubject);
      expect(result.connection).toBeInstanceOf(Subject);
      expect(result.disconnect).toBeInstanceOf(Subject);
    });

    it("should initialize ReplaySubject with the server", () => {
      const mockServer = { name: "websocket-server" };
      
      const result = EventStreamsFactory.create(mockServer);
      
      // Subscribe to init to verify the server was emitted
      let emittedServer: any;
      result.init.subscribe(server => {
        emittedServer = server;
      });
      
      expect(emittedServer).toBe(mockServer);
    });

    it("should create new Subject instances for connection and disconnect", () => {
      const mockServer = "test";
      
      const result1 = EventStreamsFactory.create(mockServer);
      const result2 = EventStreamsFactory.create(mockServer);
      
      // Each call should create new Subject instances
      expect(result1.connection).not.toBe(result2.connection);
      expect(result1.disconnect).not.toBe(result2.disconnect);
      expect(result1.init).not.toBe(result2.init);
    });

    it("should work with different server types", () => {
      // Test with string
      const stringServer = "string-server";
      const stringResult = EventStreamsFactory.create(stringServer);
      expect(stringResult.server).toBe(stringServer);

      // Test with number
      const numberServer = 12345;
      const numberResult = EventStreamsFactory.create(numberServer);
      expect(numberResult.server).toBe(numberServer);

      // Test with null
      const nullServer = null;
      const nullResult = EventStreamsFactory.create(nullServer);
      expect(nullResult.server).toBe(nullServer);

      // Test with undefined
      const undefinedServer = undefined;
      const undefinedResult = EventStreamsFactory.create(undefinedServer);
      expect(undefinedResult.server).toBe(undefinedServer);
    });

    it("should create subjects that can emit and receive events", () => {
      const mockServer = { test: true };
      const result = EventStreamsFactory.create(mockServer);
      
      // Test connection subject
      let connectionEvent: any;
      result.connection.subscribe(event => {
        connectionEvent = event;
      });
      
      const testConnectionEvent = { type: "connect", clientId: "123" };
      result.connection.next(testConnectionEvent);
      expect(connectionEvent).toBe(testConnectionEvent);

      // Test disconnect subject
      let disconnectEvent: any;
      result.disconnect.subscribe(event => {
        disconnectEvent = event;
      });
      
      const testDisconnectEvent = { type: "disconnect", reason: "timeout" };
      result.disconnect.next(testDisconnectEvent);
      expect(disconnectEvent).toBe(testDisconnectEvent);
    });

    it("should allow ReplaySubject to replay last value to new subscribers", () => {
      const mockServer = { replayed: true };
      const result = EventStreamsFactory.create(mockServer);
      
      // Subscribe after the server was already emitted
      let replayedServer: any;
      result.init.subscribe(server => {
        replayedServer = server;
      });
      
      expect(replayedServer).toBe(mockServer);
      
      // Add another subscriber and verify it also gets the replayed value
      let anotherReplayedServer: any;
      result.init.subscribe(server => {
        anotherReplayedServer = server;
      });
      
      expect(anotherReplayedServer).toBe(mockServer);
    });

    it("should emit same events to multiple subscribers on connection and disconnect subjects", () => {
      const mockServer = { multicast: true };
      const result = EventStreamsFactory.create(mockServer);
      
      // Set up multiple subscribers for connection
      const connectionEvents1: any[] = [];
      const connectionEvents2: any[] = [];
      
      result.connection.subscribe(event => connectionEvents1.push(event));
      result.connection.subscribe(event => connectionEvents2.push(event));
      
      // Set up multiple subscribers for disconnect
      const disconnectEvents1: any[] = [];
      const disconnectEvents2: any[] = [];
      
      result.disconnect.subscribe(event => disconnectEvents1.push(event));
      result.disconnect.subscribe(event => disconnectEvents2.push(event));
      
      // Emit multiple events
      const event1 = { type: "connect", id: 1 };
      const event2 = { type: "connect", id: 2 };
      const event3 = { type: "disconnect", reason: "close" };
      const event4 = { type: "disconnect", reason: "error" };
      
      result.connection.next(event1);
      result.connection.next(event2);
      result.disconnect.next(event3);
      result.disconnect.next(event4);
      
      // Verify both subscribers received the same events
      expect(connectionEvents1).toEqual([event1, event2]);
      expect(connectionEvents2).toEqual([event1, event2]);
      expect(connectionEvents1).toEqual(connectionEvents2);
      
      expect(disconnectEvents1).toEqual([event3, event4]);
      expect(disconnectEvents2).toEqual([event3, event4]);
      expect(disconnectEvents1).toEqual(disconnectEvents2);
    });
  });
});