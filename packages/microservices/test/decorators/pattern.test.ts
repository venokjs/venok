import { describe, expect, it, beforeEach, afterEach } from "bun:test";

import { 
  parseTransportAndExtras, 
  setPatternMetadata, 
  EventPatternNew, 
  MessagePatternNew 
} from "~/decorators/pattern.decorator.js";
import { 
  PATTERN_METADATA, 
  PATTERN_HANDLER_METADATA, 
  TRANSPORT_METADATA, 
  PATTERN_EXTRAS_METADATA 
} from "~/constants.js";
import { PatternHandler } from "~/enums/pattern-handler.enum.js";

describe("parseTransportAndExtras", () => {
  it("should parse transport when only transport symbol is provided", () => {
    const transport = Symbol("test-transport");
    const result = parseTransportAndExtras(transport, undefined);
    
    expect(result.transport).toBe(transport);
    expect(result.extras).toBeUndefined();
  });

  it("should parse extras when only extras object is provided", () => {
    const extras = { key: "value", timeout: 5000 };
    const result = parseTransportAndExtras(extras, undefined);
    
    expect(result.transport).toBeUndefined();
    expect(result.extras).toEqual(extras);
  });

  it("should parse both transport and extras when both are provided", () => {
    const transport = Symbol("test-transport");
    const extras = { key: "value", timeout: 5000 };
    const result = parseTransportAndExtras(transport, extras);
    
    expect(result.transport).toBe(transport);
    expect(result.extras).toEqual(extras);
  });

  it("should handle undefined transportOrExtras", () => {
    const result = parseTransportAndExtras(undefined, undefined);
    
    expect(result.transport).toBeUndefined();
    expect(result.extras).toBeUndefined();
  });
});

describe("setPatternMetadata", () => {
  let mockDescriptor: PropertyDescriptor;
  let mockFunction: Function;

  beforeEach(() => {
    mockFunction = function testMethod() {};
    mockDescriptor = {
      value: mockFunction,
      writable: true,
      enumerable: true,
      configurable: true,
    };
  });

  afterEach(() => {
    // Clear all metadata from the mock function
    const metadataKeys = [
      PATTERN_METADATA, 
      PATTERN_HANDLER_METADATA, 
      TRANSPORT_METADATA, 
      PATTERN_EXTRAS_METADATA,
    ];
    metadataKeys.forEach(key => {
      Reflect.deleteMetadata(key, mockFunction);
    });
  });

  it("should set pattern metadata correctly", () => {
    const metadata = "test-pattern";
    const transport = Symbol("transport");
    const extras = { timeout: 1000 };

    const result = setPatternMetadata(
      metadata, 
      PatternHandler.MESSAGE, 
      transport, 
      extras, 
      mockDescriptor
    );

    expect(result).toBe(mockDescriptor);
    expect(Reflect.getMetadata(PATTERN_METADATA, mockFunction)).toEqual([metadata]);
    expect(Reflect.getMetadata(PATTERN_HANDLER_METADATA, mockFunction)).toBe(PatternHandler.MESSAGE);
    expect(Reflect.getMetadata(TRANSPORT_METADATA, mockFunction)).toBe(transport);
    expect(Reflect.getMetadata(PATTERN_EXTRAS_METADATA, mockFunction)).toEqual(extras);
  });

  it("should handle array metadata correctly", () => {
    const metadata = ["pattern1", "pattern2"];
    setPatternMetadata(
      metadata, 
      PatternHandler.EVENT,
      // @ts-expect-error Mismatch types
      undefined, 
      {}, 
      mockDescriptor
    );

    expect(Reflect.getMetadata(PATTERN_METADATA, mockFunction)).toEqual(metadata);
  });

  it("should merge existing extras with new extras", () => {
    const existingExtras = { timeout: 1000 };
    const newExtras = { retries: 3 };
    
    // Set existing metadata
    Reflect.defineMetadata(PATTERN_EXTRAS_METADATA, existingExtras, mockFunction);
    
    setPatternMetadata(
      "test", 
      PatternHandler.MESSAGE,
      // @ts-expect-error Mismatch types
      undefined, 
      newExtras, 
      mockDescriptor
    );

    const result = Reflect.getMetadata(PATTERN_EXTRAS_METADATA, mockFunction);
    expect(result).toEqual({ timeout: 1000, retries: 3 });
  });

  it("should handle undefined transport and extras", () => {
    const metadata = "test";
    
    setPatternMetadata(
      metadata, 
      PatternHandler.EVENT,
      // @ts-expect-error Mismatch types
      undefined, 
      undefined, 
      mockDescriptor
    );

    expect(Reflect.getMetadata(PATTERN_METADATA, mockFunction)).toEqual([metadata]);
    expect(Reflect.getMetadata(PATTERN_HANDLER_METADATA, mockFunction)).toBe(PatternHandler.EVENT);
    expect(Reflect.getMetadata(TRANSPORT_METADATA, mockFunction)).toBeUndefined();
  });
});

describe("EventPatternNew", () => {
  class TestClass {
    testMethod() {}
    methodWithTransport() {}
    methodWithExtras() {}
    methodWithBoth() {}
    methodWithoutMetadata() {}
  }

  afterEach(() => {
    const methods = ["testMethod", "methodWithTransport", "methodWithExtras", "methodWithBoth", "methodWithoutMetadata"];
    const metadataKeys = [PATTERN_METADATA, PATTERN_HANDLER_METADATA, TRANSPORT_METADATA, PATTERN_EXTRAS_METADATA];
    
    methods.forEach(method => {
      metadataKeys.forEach(key => {
        // @ts-expect-error Mismatch types
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        Reflect.deleteMetadata(key, TestClass.prototype[method]);
      });
    });
  });

  it("should set correct metadata for basic event pattern", () => {
    const decorator = EventPatternNew("test-event");
    const descriptor = Object.getOwnPropertyDescriptor(TestClass.prototype, "testMethod")!;
    
    decorator(TestClass.prototype, "testMethod", descriptor);

    const metadata = Reflect.getMetadata(PATTERN_METADATA, TestClass.prototype.testMethod);
    const handlerType = Reflect.getMetadata(PATTERN_HANDLER_METADATA, TestClass.prototype.testMethod);

    expect(metadata).toEqual(["test-event"]);
    expect(handlerType).toBe(PatternHandler.EVENT);
  });

  it("should set transport metadata when provided", () => {
    const transport = Symbol("custom-transport");
    const decorator = EventPatternNew("event-with-transport", transport);
    const descriptor = Object.getOwnPropertyDescriptor(TestClass.prototype, "methodWithTransport")!;
    
    decorator(TestClass.prototype, "methodWithTransport", descriptor);

    const transportMeta = Reflect.getMetadata(TRANSPORT_METADATA, TestClass.prototype.methodWithTransport);
    const handlerType = Reflect.getMetadata(PATTERN_HANDLER_METADATA, TestClass.prototype.methodWithTransport);

    expect(transportMeta).toBe(transport);
    expect(handlerType).toBe(PatternHandler.EVENT);
  });

  it("should set extras metadata when provided", () => {
    const extras = { timeout: 5000 };
    const decorator = EventPatternNew("event-with-extras", extras);
    const descriptor = Object.getOwnPropertyDescriptor(TestClass.prototype, "methodWithExtras")!;
    
    decorator(TestClass.prototype, "methodWithExtras", descriptor);

    const extrasMeta = Reflect.getMetadata(PATTERN_EXTRAS_METADATA, TestClass.prototype.methodWithExtras);
    const handlerType = Reflect.getMetadata(PATTERN_HANDLER_METADATA, TestClass.prototype.methodWithExtras);

    expect(extrasMeta).toEqual({ timeout: 5000 });
    expect(handlerType).toBe(PatternHandler.EVENT);
  });

  it("should set both transport and extras when provided", () => {
    const transport = Symbol("transport");
    const extras = { retries: 3 };
    const decorator = EventPatternNew("event-full", transport, extras);
    const descriptor = Object.getOwnPropertyDescriptor(TestClass.prototype, "methodWithBoth")!;
    
    decorator(TestClass.prototype, "methodWithBoth", descriptor);

    const transportMeta = Reflect.getMetadata(TRANSPORT_METADATA, TestClass.prototype.methodWithBoth);
    const extrasMeta = Reflect.getMetadata(PATTERN_EXTRAS_METADATA, TestClass.prototype.methodWithBoth);
    const handlerType = Reflect.getMetadata(PATTERN_HANDLER_METADATA, TestClass.prototype.methodWithBoth);

    expect(transportMeta).toBe(transport);
    expect(extrasMeta).toEqual({ retries: 3 });
    expect(handlerType).toBe(PatternHandler.EVENT);
  });

  it("should handle undefined metadata", () => {
    const decorator = EventPatternNew();
    const descriptor = Object.getOwnPropertyDescriptor(TestClass.prototype, "methodWithoutMetadata")!;
    
    decorator(TestClass.prototype, "methodWithoutMetadata", descriptor);

    const metadata = Reflect.getMetadata(PATTERN_METADATA, TestClass.prototype.methodWithoutMetadata);
    const handlerType = Reflect.getMetadata(PATTERN_HANDLER_METADATA, TestClass.prototype.methodWithoutMetadata);

    expect(metadata).toEqual([undefined]);
    expect(handlerType).toBe(PatternHandler.EVENT);
  });

  it("should return the same descriptor", () => {
    const decorator = EventPatternNew("test");
    const originalDescriptor = Object.getOwnPropertyDescriptor(TestClass.prototype, "testMethod")!;
    
    const result = decorator(TestClass.prototype, "testMethod", originalDescriptor);

    expect(result).toBe(originalDescriptor);
    expect(typeof result?.value).toBe("function");
  });
});

describe("MessagePatternNew", () => {
  class TestClass {
    testMethod() {}
    objectPatternMethod() {}
    methodWithTransport() {}
    methodWithExtras() {}
    numericPatternMethod() {}
    complexMethod() {}
  }

  afterEach(() => {
    const methods = ["testMethod", "objectPatternMethod", "methodWithTransport", "methodWithExtras", "numericPatternMethod", "complexMethod"];
    const metadataKeys = [PATTERN_METADATA, PATTERN_HANDLER_METADATA, TRANSPORT_METADATA, PATTERN_EXTRAS_METADATA];
    
    methods.forEach(method => {
      metadataKeys.forEach(key => {
        // @ts-expect-error Mismatch types
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        Reflect.deleteMetadata(key, TestClass.prototype[method]);
      });
    });
  });

  it("should set correct metadata for string message pattern", () => {
    const decorator = MessagePatternNew("test-message");
    const descriptor = Object.getOwnPropertyDescriptor(TestClass.prototype, "testMethod")!;
    
    decorator(TestClass.prototype, "testMethod", descriptor);

    const metadata = Reflect.getMetadata(PATTERN_METADATA, TestClass.prototype.testMethod);
    const handlerType = Reflect.getMetadata(PATTERN_HANDLER_METADATA, TestClass.prototype.testMethod);

    expect(metadata).toEqual(["test-message"]);
    expect(handlerType).toBe(PatternHandler.MESSAGE);
  });

  it("should set correct metadata for object pattern", () => {
    const pattern = { cmd: "get-user" };
    const decorator = MessagePatternNew(pattern);
    const descriptor = Object.getOwnPropertyDescriptor(TestClass.prototype, "objectPatternMethod")!;
    
    decorator(TestClass.prototype, "objectPatternMethod", descriptor);

    const metadata = Reflect.getMetadata(PATTERN_METADATA, TestClass.prototype.objectPatternMethod);
    const handlerType = Reflect.getMetadata(PATTERN_HANDLER_METADATA, TestClass.prototype.objectPatternMethod);

    expect(metadata).toEqual([{ cmd: "get-user" }]);
    expect(handlerType).toBe(PatternHandler.MESSAGE);
  });

  it("should set correct metadata for numeric pattern", () => {
    const decorator = MessagePatternNew(42);
    const descriptor = Object.getOwnPropertyDescriptor(TestClass.prototype, "numericPatternMethod")!;
    
    decorator(TestClass.prototype, "numericPatternMethod", descriptor);

    const metadata = Reflect.getMetadata(PATTERN_METADATA, TestClass.prototype.numericPatternMethod);
    const handlerType = Reflect.getMetadata(PATTERN_HANDLER_METADATA, TestClass.prototype.numericPatternMethod);

    expect(metadata).toEqual([42]);
    expect(handlerType).toBe(PatternHandler.MESSAGE);
  });

  it("should set transport metadata when provided", () => {
    const transport = Symbol("message-transport");
    const decorator = MessagePatternNew("message-with-transport", transport);
    const descriptor = Object.getOwnPropertyDescriptor(TestClass.prototype, "methodWithTransport")!;
    
    decorator(TestClass.prototype, "methodWithTransport", descriptor);

    const transportMeta = Reflect.getMetadata(TRANSPORT_METADATA, TestClass.prototype.methodWithTransport);
    const handlerType = Reflect.getMetadata(PATTERN_HANDLER_METADATA, TestClass.prototype.methodWithTransport);

    expect(transportMeta).toBe(transport);
    expect(handlerType).toBe(PatternHandler.MESSAGE);
  });

  it("should set extras metadata when provided", () => {
    const extras = { queue: "high-priority" };
    const decorator = MessagePatternNew("message-with-extras", extras);
    const descriptor = Object.getOwnPropertyDescriptor(TestClass.prototype, "methodWithExtras")!;
    
    decorator(TestClass.prototype, "methodWithExtras", descriptor);

    const extrasMeta = Reflect.getMetadata(PATTERN_EXTRAS_METADATA, TestClass.prototype.methodWithExtras);
    const handlerType = Reflect.getMetadata(PATTERN_HANDLER_METADATA, TestClass.prototype.methodWithExtras);

    expect(extrasMeta).toEqual({ queue: "high-priority" });
    expect(handlerType).toBe(PatternHandler.MESSAGE);
  });

  it("should handle complex scenarios with all parameters", () => {
    const pattern = { cmd: "complex", version: 2 };
    const transport = Symbol("transport");
    const extras = { durable: true };
    const decorator = MessagePatternNew(pattern, transport, extras);
    const descriptor = Object.getOwnPropertyDescriptor(TestClass.prototype, "complexMethod")!;
    
    decorator(TestClass.prototype, "complexMethod", descriptor);

    const metadata = Reflect.getMetadata(PATTERN_METADATA, TestClass.prototype.complexMethod);
    const transportMeta = Reflect.getMetadata(TRANSPORT_METADATA, TestClass.prototype.complexMethod);
    const extrasMeta = Reflect.getMetadata(PATTERN_EXTRAS_METADATA, TestClass.prototype.complexMethod);
    const handlerType = Reflect.getMetadata(PATTERN_HANDLER_METADATA, TestClass.prototype.complexMethod);

    expect(metadata).toEqual([{ cmd: "complex", version: 2 }]);
    expect(transportMeta).toBe(transport);
    expect(extrasMeta).toEqual({ durable: true });
    expect(handlerType).toBe(PatternHandler.MESSAGE);
  });

  it("should return the same descriptor", () => {
    const decorator = MessagePatternNew("test");
    const originalDescriptor = Object.getOwnPropertyDescriptor(TestClass.prototype, "testMethod")!;
    
    const result = decorator(TestClass.prototype, "testMethod", originalDescriptor);

    expect(result).toBe(originalDescriptor);
    expect(typeof result?.value).toBe("function");
  });
});

describe("Integration tests", () => {
  it("should distinguish between EventPatternNew and MessagePatternNew", () => {
    class TestService {
      @EventPatternNew("user.created")
      onUserCreated() {}

      @MessagePatternNew("get.user")
      getUser() {}
    }

    const eventHandlerType = Reflect.getMetadata(PATTERN_HANDLER_METADATA, TestService.prototype.onUserCreated);
    const messageHandlerType = Reflect.getMetadata(PATTERN_HANDLER_METADATA, TestService.prototype.getUser);

    expect(eventHandlerType).toBe(PatternHandler.EVENT);
    expect(messageHandlerType).toBe(PatternHandler.MESSAGE);
  });

  it("should handle multiple decorators on the same class", () => {
    class MultiPatternService {
      @EventPatternNew("event1")
      handleEvent1() {}

      @EventPatternNew("event2", Symbol("transport"))
      handleEvent2() {}

      @MessagePatternNew({ cmd: "command1" })
      handleCommand1() {}

      @MessagePatternNew({ cmd: "command2" }, { timeout: 3000 })
      handleCommand2() {}
    }

    // Test that all methods have correct metadata
    expect(Reflect.getMetadata(PATTERN_HANDLER_METADATA, MultiPatternService.prototype.handleEvent1)).toBe(PatternHandler.EVENT);
    expect(Reflect.getMetadata(PATTERN_HANDLER_METADATA, MultiPatternService.prototype.handleEvent2)).toBe(PatternHandler.EVENT);
    expect(Reflect.getMetadata(PATTERN_HANDLER_METADATA, MultiPatternService.prototype.handleCommand1)).toBe(PatternHandler.MESSAGE);
    expect(Reflect.getMetadata(PATTERN_HANDLER_METADATA, MultiPatternService.prototype.handleCommand2)).toBe(PatternHandler.MESSAGE);

    // Test specific metadata
    expect(Reflect.getMetadata(PATTERN_METADATA, MultiPatternService.prototype.handleEvent1)).toEqual(["event1"]);
    expect(Reflect.getMetadata(PATTERN_METADATA, MultiPatternService.prototype.handleCommand1)).toEqual([{ cmd: "command1" }]);
    expect(Reflect.getMetadata(PATTERN_EXTRAS_METADATA, MultiPatternService.prototype.handleCommand2)).toEqual({ timeout: 3000 });
  });
});