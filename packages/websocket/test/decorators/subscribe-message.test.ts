 
import { afterEach, beforeEach, describe, expect, it, jest } from "bun:test";
import { Reflector } from "@venok/core";

import { SubscribeMessage } from "~/decorators/subscribe-message.decorator.js";
import { MESSAGE_METADATA } from "~/constants.js";

describe("SubscribeMessage", () => {
  let reflector: Reflector;

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    reflector = new Reflector();
  });

  describe("basic functionality", () => {
    it("should be a function created by Reflector.createDecorator", () => {
      expect(typeof SubscribeMessage).toBe("function");
      expect(SubscribeMessage.KEY).toBe(MESSAGE_METADATA);
    });

    it("should return a method decorator function when called", () => {
      const decorator = SubscribeMessage("test-event");
      expect(typeof decorator).toBe("function");
    });

    it("should set message metadata on the method", () => {
      class TestGateway {
        @SubscribeMessage("test-event")
        handleTest() {}
      }

      const method = TestGateway.prototype.handleTest;
      const metadata = Reflect.getMetadata(MESSAGE_METADATA, method);
      expect(metadata).toBe("test-event");
    });

    it("should set message metadata using decorator KEY", () => {
      class TestGateway {
        @SubscribeMessage("test-event")
        handleTest() {}
      }

      const method = TestGateway.prototype.handleTest;
      const metadata = Reflect.getMetadata(SubscribeMessage.KEY, method);
      expect(metadata).toBe("test-event");
    });

    it("should work with Reflector.get method", () => {
      class TestGateway {
        @SubscribeMessage("test-event")
        handleTest() {}
      }

      const method = TestGateway.prototype.handleTest;
      const metadata = reflector.get(SubscribeMessage, method);
      expect(metadata).toBe("test-event");
    });
  });

  describe("message patterns", () => {
    it("should handle string message patterns", () => {
      class TestGateway {
        @SubscribeMessage("user:login")
        handleUserLogin() {}

        @SubscribeMessage("user:logout")
        handleUserLogout() {}

        @SubscribeMessage("message:send")
        handleMessageSend() {}
      }

      expect(Reflect.getMetadata(MESSAGE_METADATA, TestGateway.prototype.handleUserLogin)).toBe("user:login");
      expect(Reflect.getMetadata(MESSAGE_METADATA, TestGateway.prototype.handleUserLogout)).toBe("user:logout");
      expect(Reflect.getMetadata(MESSAGE_METADATA, TestGateway.prototype.handleMessageSend)).toBe("message:send");
    });

    it("should handle empty string patterns", () => {
      class TestGateway {
        @SubscribeMessage("")
        handleEmpty() {}
      }

      const metadata = Reflect.getMetadata(MESSAGE_METADATA, TestGateway.prototype.handleEmpty);
      expect(metadata).toBe("");
    });

    it("should handle special characters in patterns", () => {
      class TestGateway {
        @SubscribeMessage("event-with-dashes")
        handleDashes() {}

        @SubscribeMessage("event_with_underscores")
        handleUnderscores() {}

        @SubscribeMessage("event.with.dots")
        handleDots() {}

        @SubscribeMessage("event/with/slashes")
        handleSlashes() {}

        @SubscribeMessage("event@with@symbols")
        handleSymbols() {}
      }

      expect(Reflect.getMetadata(MESSAGE_METADATA, TestGateway.prototype.handleDashes)).toBe("event-with-dashes");
      expect(Reflect.getMetadata(MESSAGE_METADATA, TestGateway.prototype.handleUnderscores)).toBe("event_with_underscores");
      expect(Reflect.getMetadata(MESSAGE_METADATA, TestGateway.prototype.handleDots)).toBe("event.with.dots");
      expect(Reflect.getMetadata(MESSAGE_METADATA, TestGateway.prototype.handleSlashes)).toBe("event/with/slashes");
      expect(Reflect.getMetadata(MESSAGE_METADATA, TestGateway.prototype.handleSymbols)).toBe("event@with@symbols");
    });

    it("should handle numeric patterns (converted to strings)", () => {
      class TestGateway {
        @SubscribeMessage("123")
        handleNumericString() {}
      }

      const metadata = Reflect.getMetadata(MESSAGE_METADATA, TestGateway.prototype.handleNumericString);
      expect(metadata).toBe("123");
    });

    it("should handle whitespace in patterns", () => {
      class TestGateway {
        @SubscribeMessage(" event ")
        handleWhitespace() {}

        @SubscribeMessage("event with spaces")
        handleSpaces() {}
      }

      expect(Reflect.getMetadata(MESSAGE_METADATA, TestGateway.prototype.handleWhitespace)).toBe(" event ");
      expect(Reflect.getMetadata(MESSAGE_METADATA, TestGateway.prototype.handleSpaces)).toBe("event with spaces");
    });
  });

  describe("inheritance", () => {
    it("should work correctly with inheritance", () => {
      class BaseGateway {
        @SubscribeMessage("base-event")
        handleBaseEvent() {}
      }

      class ExtendedGateway extends BaseGateway {
        @SubscribeMessage("extended-event")
        handleExtendedEvent() {}
      }

      expect(Reflect.getMetadata(MESSAGE_METADATA, BaseGateway.prototype.handleBaseEvent)).toBe("base-event");
      expect(Reflect.getMetadata(MESSAGE_METADATA, ExtendedGateway.prototype.handleBaseEvent)).toBe("base-event");
      expect(Reflect.getMetadata(MESSAGE_METADATA, ExtendedGateway.prototype.handleExtendedEvent)).toBe("extended-event");
    });

    it("should allow overriding parent methods with different event patterns", () => {
      class ParentGateway {
        @SubscribeMessage("parent-event")
        sharedMethod() {}
      }

      class ChildGateway extends ParentGateway {
        @SubscribeMessage("child-event")
        sharedMethod() {}
      }

      expect(Reflect.getMetadata(MESSAGE_METADATA, ParentGateway.prototype.sharedMethod)).toBe("parent-event");
      expect(Reflect.getMetadata(MESSAGE_METADATA, ChildGateway.prototype.sharedMethod)).toBe("child-event");
    });
  });

  describe("type safety", () => {
    it("should accept string patterns", () => {
      class TestGateway {
        @SubscribeMessage("string-pattern")
        stringMethod() {}
      }

      expect(Reflect.getMetadata(MESSAGE_METADATA, TestGateway.prototype.stringMethod)).toBe("string-pattern");
    });

    it("should maintain type consistency through Reflector", () => {
      class TestGateway {
        @SubscribeMessage("typed-event")
        typedMethod() {}
      }

      const method = TestGateway.prototype.typedMethod;
      const metadata: string = reflector.get(SubscribeMessage, method);
      expect(typeof metadata).toBe("string");
      expect(metadata).toBe("typed-event");
    });
  });
});