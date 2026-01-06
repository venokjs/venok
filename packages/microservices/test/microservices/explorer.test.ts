import type { InstanceWrapper, LoggerService, VenokParamsFactoryInterface } from "@venok/core";
import type { DiscoveryService } from "@venok/integration";

import type { MessageHandler, MicroservicePattern, MicroservicePatternHandlerMetadata } from "~/interfaces/index.js";

import { ExecutionContextHost as VenokExecutionContextHost, Injectable, MetadataScanner, VenokContainer } from "@venok/core";
import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { Observable, of } from "rxjs";

import { MicroserviceExplorerService } from "~/microservices/explorer.js";
import { PatternFinder } from "~/microservices/finder.js";
import { MicroserviceConfig } from "~/microservices/config.js";
import { MicroserviceParamsFactory } from "~/microservices/params-factory.js";
import { MicroserviceExceptionFiltersContext } from "~/filters/context.js";

// Mock controllers and test patterns
const TEST_PATTERN_1 = "test.pattern.1";
const TEST_PATTERN_2 = { cmd: "test", action: "pattern2" };
const TEST_PATTERN_3 = "test.pattern.3";

@Injectable()
class TestMicroservice {
  testMethod1() {
    return "result1";
  }

  testMethod2() {
    return "result2";  
  }

  testMethod3() {
    return of("observable-result");
  }
}

@Injectable() 
class TestEventMicroservice {
  eventMethod1() {
    return "event-result1";
  }

  eventMethod2() {
    return of("event-observable");
  }
}

@Injectable()
class NonMicroservice {
  normalMethod() {
    return "normal-result";
  }
}

describe("MicroserviceExplorerService", () => {
  let explorerService: MicroserviceExplorerService;
  let mockContainer: VenokContainer;
  let mockDiscoveryService: DiscoveryService;
  let mockMetadataScanner: MetadataScanner;
  let mockPatternFinder: PatternFinder;
  let mockMicroserviceConfig: MicroserviceConfig;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let mockParamsFactory: VenokParamsFactoryInterface<unknown>;
  let mockLogger: LoggerService;
  
  let testMicroserviceWrapper: InstanceWrapper;
  let testEventMicroserviceWrapper: InstanceWrapper;
  let nonMicroserviceWrapper: InstanceWrapper;

  let spies: Array<any> = [];

  beforeEach(() => {
    // Create mock dependencies
    mockContainer = new VenokContainer();
    mockDiscoveryService = {
      getProviders: mock(() => [testMicroserviceWrapper, testEventMicroserviceWrapper, nonMicroserviceWrapper]),
    } as unknown as DiscoveryService;
    mockMetadataScanner = new MetadataScanner();
    mockLogger = {
      error: mock(() => {}),
      warn: mock(() => {}),
      log: mock(() => {}),
      debug: mock(() => {}),
    } as any;

    // Create mock microservice config
    mockMicroserviceConfig = {
      transportId: Symbol("test-transport"),
    } as MicroserviceConfig;

    // Create mock params factory  
    mockParamsFactory = {
      exchangeKeyForValue: mock(() => "test-param"),
    } as VenokParamsFactoryInterface<unknown>;

    // Create instance wrappers
    testMicroserviceWrapper = {
      instance: new TestMicroservice(),
      metatype: TestMicroservice,
      isDependencyTreeStatic: mock(() => true),
      isDependencyTreeDurable: mock(() => false),
      id: "test-microservice-id",
    } as unknown as InstanceWrapper;

    testEventMicroserviceWrapper = {
      instance: new TestEventMicroservice(),
      metatype: TestEventMicroservice, 
      isDependencyTreeStatic: mock(() => false),
      isDependencyTreeDurable: mock(() => false),
      id: "test-event-microservice-id",
    } as unknown as InstanceWrapper;

    nonMicroserviceWrapper = {
      instance: new NonMicroservice(),
      metatype: NonMicroservice,
      isDependencyTreeStatic: mock(() => true),
      isDependencyTreeDurable: mock(() => false),
      id: "non-microservice-id",
    } as unknown as InstanceWrapper;

    // Create explorer service
    explorerService = new MicroserviceExplorerService(
      mockContainer,
      mockDiscoveryService,
      mockMetadataScanner
    );

    // Inject dependencies
    (explorerService as any).microserviceConfig = mockMicroserviceConfig;
    (explorerService as any).logger = mockLogger;

    // Mock pattern finder
    mockPatternFinder = new PatternFinder(mockMetadataScanner);
    (explorerService as any).patternFinder = mockPatternFinder;

    // Mock onModuleInit to set paramsFactory
    explorerService.onModuleInit();
  });

  afterEach(() => {
    spies.forEach(spy => spy.mockRestore());
    spies = [];
  });

  describe("onModuleInit", () => {
    it("should initialize paramsFactory", () => {
      explorerService.onModuleInit();
      
      expect((explorerService as any).paramsFactory).toBeInstanceOf(MicroserviceParamsFactory);
    });
  });

  describe("getSettings", () => {
    it("should return correct explorer settings", () => {
      const settings = (explorerService as any).getSettings();
      
      expect(settings).toEqual({
        contextType: "microservice",
        isRequestScopeSupported: true,
        returnProxyValueFromRequestScope: true,
        exceptionsFilterClass: MicroserviceExceptionFiltersContext,
        options: { guards: true, interceptors: true, filters: true },
      });
    });
  });

  describe("filterProperties", () => {
    beforeEach(() => {
      // Mock metadata for microservice detection
      // @ts-expect-error Mismatch types
      spies.push(spyOn(explorerService, "get").mockImplementation((metadataKey, target) => {
        if (target === TestMicroservice || target === TestEventMicroservice) {
          return true; // Has microservice metadata
        }
        return false; // No microservice metadata
      }));

      // Mock pattern finder to return test patterns
      spies.push(spyOn(mockPatternFinder, "explore").mockImplementation((instance) => {
        if (instance instanceof TestMicroservice) {
          return [
            {
              methodKey: "testMethod1",
              patterns: [TEST_PATTERN_1],
              isEventHandler: false,
              extras: { metadata: "test1" },
            },
            {
              methodKey: "testMethod2", 
              patterns: [TEST_PATTERN_2],
              isEventHandler: false,
              extras: { metadata: "test2" },
            },
          ] as MicroservicePatternHandlerMetadata[];
        }
        if (instance instanceof TestEventMicroservice) {
          return [
            {
              methodKey: "eventMethod1",
              patterns: [TEST_PATTERN_3],
              isEventHandler: true,
              extras: { metadata: "event1" },
            },
          ] as MicroservicePatternHandlerMetadata[];
        }
        return [];
      }));

      // Mock createCallback
      // @ts-expect-error Mismatch types
      spies.push(spyOn(explorerService as any, "createCallback").mockImplementation((wrapper, methodKey) => {
        return mock(() => `callback-${methodKey}`);
      }));

      // Mock createEventHandler
      // @ts-expect-error Mismatch types
      spies.push(spyOn(explorerService as any, "createEventHandler").mockImplementation((proxy, isStatic) => {
        return mock(() => `event-handler-${isStatic}`);
      }));
    });

    it("should return undefined when wrapper has no metatype", () => {
      const wrapperWithoutMetatype = { ...testMicroserviceWrapper, metatype: undefined };
      
      const result = (explorerService as any).filterProperties(wrapperWithoutMetatype, "test-key");
      
      expect(result).toBeUndefined();
    });

    it("should return undefined when wrapper is not a microservice", () => {
      const result = (explorerService as any).filterProperties(nonMicroserviceWrapper, "test-key");
      
      expect(result).toBeUndefined();
    });

    it("should return handlers for microservice with patterns", () => {
      const result = (explorerService as any).filterProperties(testMicroserviceWrapper, "test-key");
      
      expect(result).toBeDefined();
      expect(result.handlers).toHaveLength(2);
      
      expect(result.handlers[0]).toEqual({
        pattern: TEST_PATTERN_1,
        callback: expect.any(Function),
        isEventHandler: false,
        extras: { metadata: "test1" },
      });
      
      expect(result.handlers[1]).toEqual({
        pattern: TEST_PATTERN_2,
        callback: expect.any(Function),
        isEventHandler: false,
        extras: { metadata: "test2" },
      });
    });

    it("should filter handlers by transport when transportId is defined", () => {
      const matchingTransportId = Symbol("matching-transport");
      // @ts-expect-error Mismatch types
      mockMicroserviceConfig.transportId = matchingTransportId;

      // Clear previous spies and create new ones specific to this test
      const existingPatternFinderSpy = spies.find(spy => spy.getMockName?.() === "explore");
      if (existingPatternFinderSpy) {
        existingPatternFinderSpy.mockRestore();
        spies = spies.filter(spy => spy !== existingPatternFinderSpy);
      }

      // Mock pattern finder to return patterns with different transports
      const patternFinderSpy = spyOn(mockPatternFinder, "explore").mockImplementation(() => [
        {
          methodKey: "testMethod1",
          patterns: [TEST_PATTERN_1],
          isEventHandler: false,
          transport: Symbol("different-transport"),
          extras: { metadata: "test1" },
        },
        {
          methodKey: "testMethod2", 
          patterns: [TEST_PATTERN_2],
          isEventHandler: false,
          transport: matchingTransportId,
          extras: { metadata: "test2" },
        },
        {
          methodKey: "testMethod3",
          patterns: [TEST_PATTERN_3],
          isEventHandler: false,
          // No transport specified - should be included
          extras: { metadata: "test3" },
        },
      ] as MicroservicePatternHandlerMetadata[]);

      spies.push(patternFinderSpy);

      const result = (explorerService as any).filterProperties(testMicroserviceWrapper, "test-key");
      
      expect(result).toBeDefined();
      expect(result.handlers).toHaveLength(2); // Should exclude first handler with wrong transport
      expect(result.handlers[0].pattern).toBe(TEST_PATTERN_2);
      expect(result.handlers[1].pattern).toBe(TEST_PATTERN_3);
    });

    it("should handle event handlers differently", () => {
      const result = (explorerService as any).filterProperties(testEventMicroserviceWrapper, "test-key");
      
      expect(result).toBeDefined();
      expect(result.handlers).toHaveLength(1);
      expect(result.handlers[0].isEventHandler).toBe(true);
      expect(result.handlers[0].pattern).toBe(TEST_PATTERN_3);
    });

    it("should expand multiple patterns into separate handlers", () => {
      spies.push(spyOn(mockPatternFinder, "explore").mockImplementation(() => [
        {
          methodKey: "testMethod1",
          patterns: [TEST_PATTERN_1, TEST_PATTERN_2, TEST_PATTERN_3], // Multiple patterns
          isEventHandler: false,
          extras: { metadata: "multi" },
        },
      ] as MicroservicePatternHandlerMetadata[]));

      const result = (explorerService as any).filterProperties(testMicroserviceWrapper, "test-key");
      
      expect(result).toBeDefined();
      expect(result.handlers).toHaveLength(3); // Should create separate handler for each pattern
      expect(result.handlers[0].pattern).toBe(TEST_PATTERN_1);
      expect(result.handlers[1].pattern).toBe(TEST_PATTERN_2);
      expect(result.handlers[2].pattern).toBe(TEST_PATTERN_3);
    });
  });

  describe("createEventHandler", () => {
    let mockProxy: any;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let mockEventHandler: MessageHandler;

    beforeEach(() => {
      mockProxy = mock(async (...args) => `proxy-result-${args.length}`);
      // @ts-expect-error Mismatch types
      spies.push(spyOn(explorerService as any, "forkJoinHandlersIfAttached").mockImplementation((returnValue) => returnValue));
      // @ts-expect-error Mismatch types
      explorerService.type = "microservice";
    });

    it("should create event handler for static dependencies", async () => {
      const eventHandler = (explorerService as any).createEventHandler(mockProxy, true);
      
      const mockContext = new VenokExecutionContextHost([]);
      await eventHandler(mockContext, "arg1", "arg2");
      
      expect(mockProxy).toHaveBeenCalledWith("arg1", "arg2"); // Context stripped for static
      expect((explorerService as any).forkJoinHandlersIfAttached).toHaveBeenCalled();
    });

    it("should create event handler for non-static dependencies", async () => {
      const eventHandler = (explorerService as any).createEventHandler(mockProxy, false);
      
      await eventHandler("arg1", "arg2");
      
      // Should create context and prepend it to args
      expect(mockProxy).toHaveBeenCalled();
      const calledArgs = mockProxy.mock.calls[0];
      expect(calledArgs.length).toBeGreaterThan(2); // At least context + original args
      expect(calledArgs[0]).toBeInstanceOf(VenokExecutionContextHost);
      
      // Check forkJoinHandlersIfAttached was called 
      expect((explorerService as any).forkJoinHandlersIfAttached).toHaveBeenCalled();
    });

    it("should handle existing context for static dependencies", async () => {
      const eventHandler = (explorerService as any).createEventHandler(mockProxy, true);
      
      const mockContext = new VenokExecutionContextHost([]);
      await eventHandler(mockContext, "arg1", "arg2");
      
      expect(mockProxy).toHaveBeenCalledWith("arg1", "arg2"); // Context should be stripped
    });

    it("should handle existing context for non-static dependencies", async () => {
      const eventHandler = (explorerService as any).createEventHandler(mockProxy, false);
      
      const mockContext = new VenokExecutionContextHost([]);
      await eventHandler(mockContext, "arg1", "arg2");
      
      expect(mockProxy).toHaveBeenCalledWith(mockContext, "arg1", "arg2"); // Context should remain
    });
  });

  describe("getOriginalArgsForHandler", () => {
    it("should return args without ExecutionContextHost", () => {
      const mockContext = new VenokExecutionContextHost([]);
      const args = [mockContext, "arg1", "arg2"];
      
      const result = (explorerService as any).getOriginalArgsForHandler(args);
      
      expect(result).toEqual(["arg1", "arg2"]);
    });

    it("should return all args when no ExecutionContextHost", () => {
      const args = ["arg1", "arg2", "arg3"];
      
      const result = (explorerService as any).getOriginalArgsForHandler(args);
      
      expect(result).toEqual(["arg1", "arg2", "arg3"]);
    });

    it("should handle empty args", () => {
      const result = (explorerService as any).getOriginalArgsForHandler([]);
      
      expect(result).toEqual([]);
    });
  });

  describe("forkJoinHandlersIfAttached", () => {
    let mockHandlerRef: MessageHandler;

    beforeEach(() => {
      mockHandlerRef = mock(async () => "next-result") as MessageHandler;
    });

    it("should return current value when no next handler", () => {
      const currentReturnValue = Promise.resolve("current-result");
      const originalArgs = ["arg1", "arg2"];
      
      const result = (explorerService as any).forkJoinHandlersIfAttached(
        currentReturnValue,
        originalArgs,
        mockHandlerRef
      );
      
      expect(result).toBe(currentReturnValue);
    });

    it("should fork join when next handler exists", async () => {
      mockHandlerRef.next = mock(async () => of("next-result")) as MessageHandler;
      
      const currentReturnValue = Promise.resolve("current-result");
      const originalArgs = ["arg1", "arg2"];
      
      const result = (explorerService as any).forkJoinHandlersIfAttached(
        currentReturnValue,
        originalArgs,
        mockHandlerRef
      );
      
      expect(mockHandlerRef.next).toHaveBeenCalledWith("arg1", "arg2");
      expect(result).toBeInstanceOf(Observable);
    });

    it("should handle observable current return value", async () => {
      mockHandlerRef.next = mock(async () => Promise.resolve("next-result")) as MessageHandler;
      
      const currentReturnValue = of("current-observable-result");
      const originalArgs = ["arg1", "arg2"];
      
      const result = (explorerService as any).forkJoinHandlersIfAttached(
        currentReturnValue,
        originalArgs,
        mockHandlerRef
      );
      
      expect(mockHandlerRef.next).toHaveBeenCalledWith("arg1", "arg2");
      expect(result).toBeInstanceOf(Observable);
    });
  });

  describe("integration tests", () => {
    beforeEach(() => {
      // Set up realistic mocks for integration testing
      spies.push(spyOn(explorerService, "get").mockReturnValue(true));
      spies.push(spyOn(mockPatternFinder, "explore").mockReturnValue([
        {
          methodKey: "testMethod1",
          patterns: [TEST_PATTERN_1],
          isEventHandler: false,
          extras: { metadata: "test1" },
        },
      ] as MicroservicePatternHandlerMetadata[]));
      spies.push(spyOn(explorerService as any, "createCallback").mockReturnValue(mock(() => "test-callback")));
    });

    it("should explore and return microservice metadata", () => {
      const result = explorerService.explore("microservice-key");
      
      expect(result.length).toBeGreaterThan(0);
      const microserviceResult = result.find(r => r.handlers.some(h => h.pattern === TEST_PATTERN_1));
      expect(microserviceResult).toBeDefined();
      expect(microserviceResult!.handlers).toHaveLength(1);
      expect(microserviceResult!.handlers[0].pattern).toBe(TEST_PATTERN_1);
      expect(microserviceResult!.handlers[0].isEventHandler).toBe(false);
    });

    it("should handle empty results gracefully", () => {
      spies.push(spyOn(explorerService, "get").mockReturnValue(false)); // No microservices found
      
      const result = explorerService.explore("microservice-key");
      
      expect(result).toHaveLength(0);
    });

    it("should propagate pattern finder errors", () => {
      // Mock filterProperties to throw an error when pattern finder errors occur
      spies.push(spyOn(explorerService as any, "filterProperties").mockImplementation(() => {
        throw new Error("Pattern finder error");
      }));
      
      // Should throw the error since it's not caught in the base explorer
      expect(() => explorerService.explore("microservice-key")).toThrow("Pattern finder error");
    });
  });

  describe("edge cases", () => {
    it("should handle null wrapper instance", () => {
      const nullWrapper = { ...testMicroserviceWrapper, metatype: null };
      
      const result = (explorerService as any).filterProperties(nullWrapper, "test-key");
      
      expect(result).toBeUndefined();
    });

    it("should handle empty pattern arrays", () => {
      spies.push(spyOn(explorerService, "get").mockReturnValue(true));
      spies.push(spyOn(mockPatternFinder, "explore").mockReturnValue([
        {
          methodKey: "testMethod1",
          patterns: [], // Empty patterns
          isEventHandler: false,
          extras: {},
        },
      ] as MicroservicePatternHandlerMetadata[]));

      const result = (explorerService as any).filterProperties(testMicroserviceWrapper, "test-key");
      
      expect(result).toBeDefined();
      expect(result.handlers).toHaveLength(0);
    });

    it("should handle undefined transportId in config", () => {
      // @ts-expect-error Mismatch types
      mockMicroserviceConfig.transportId = undefined as any;
      
      spies.push(spyOn(explorerService, "get").mockReturnValue(true));
      spies.push(spyOn(mockPatternFinder, "explore").mockReturnValue([
        {
          methodKey: "testMethod1",
          patterns: [TEST_PATTERN_1],
          isEventHandler: false,
          transport: Symbol("any-transport"),
          extras: {},
        },
      ] as MicroservicePatternHandlerMetadata[]));

      const result = (explorerService as any).filterProperties(testMicroserviceWrapper, "test-key");
      
      expect(result).toBeDefined();
      expect(result.handlers).toHaveLength(1); // Should include all patterns when transportId is undefined
    });

    it("should handle undefined transport in pattern", () => {
      // @ts-expect-error Mismatch types
      mockMicroserviceConfig.transportId = Symbol("test-transport");
      
      spies.push(spyOn(explorerService, "get").mockReturnValue(true));
      spies.push(spyOn(mockPatternFinder, "explore").mockReturnValue([
        {
          methodKey: "testMethod1", 
          patterns: [TEST_PATTERN_1],
          isEventHandler: false,
          transport: undefined, // Undefined transport
          extras: {},
        },
      ] as MicroservicePatternHandlerMetadata[]));

      const result = (explorerService as any).filterProperties(testMicroserviceWrapper, "test-key");
      
      expect(result).toBeDefined();
      expect(result.handlers).toHaveLength(1); // Should include pattern when transport is undefined
    });

    it("should handle complex nested patterns", () => {
      const complexPattern: MicroservicePattern = {
        cmd: "test",
        nested: {
          action: "complex",
          params: {
            id: 123,
            type: "nested",
          },
        },
      };

      spies.push(spyOn(explorerService, "get").mockReturnValue(true));
      spies.push(spyOn(mockPatternFinder, "explore").mockReturnValue([
        {
          methodKey: "testMethod1",
          patterns: [complexPattern],
          isEventHandler: false,
          extras: { complex: true },
        },
      ] as MicroservicePatternHandlerMetadata[]));
      spies.push(spyOn(explorerService as any, "createCallback").mockReturnValue(mock(() => "complex-callback")));

      const result = (explorerService as any).filterProperties(testMicroserviceWrapper, "test-key");
      
      expect(result).toBeDefined();
      expect(result.handlers).toHaveLength(1);
      expect(result.handlers[0].pattern).toEqual(complexPattern);
      expect(result.handlers[0].extras).toEqual({ complex: true });
    });

    it("should handle mixed event and message handlers", () => {
      spies.push(spyOn(explorerService, "get").mockReturnValue(true));
      spies.push(spyOn(mockPatternFinder, "explore").mockReturnValue([
        {
          methodKey: "eventMethod",
          patterns: [TEST_PATTERN_1],
          isEventHandler: true,
          extras: { type: "event" },
        },
        {
          methodKey: "messageMethod",
          patterns: [TEST_PATTERN_2],
          isEventHandler: false,
          extras: { type: "message" },
        },
      ] as MicroservicePatternHandlerMetadata[]));

      const createCallbackSpy = spyOn(explorerService as any, "createCallback").mockReturnValue(mock(() => "regular-callback"));
      const createEventHandlerSpy = spyOn(explorerService as any, "createEventHandler").mockReturnValue(mock(() => "event-callback"));
      spies.push(createCallbackSpy, createEventHandlerSpy);

      const result = (explorerService as any).filterProperties(testEventMicroserviceWrapper, "test-key");
      
      expect(result).toBeDefined();
      expect(result.handlers).toHaveLength(2);
      
      expect(result.handlers[0].isEventHandler).toBe(true);
      expect(result.handlers[1].isEventHandler).toBe(false);
      
      expect(createEventHandlerSpy).toHaveBeenCalledWith(expect.any(Function), false); // Non-static
      expect(createCallbackSpy).toHaveBeenCalled();
    });
  });
});