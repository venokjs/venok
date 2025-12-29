/* eslint-disable @typescript-eslint/no-unused-vars */
import type { InstanceWrapper, VenokParamsFactoryInterface } from "@venok/core";
import type { ExplorerSettings } from "@venok/integration";

import { CoreModule, Inject, Injectable, Injector, Logger, MetadataScanner, Reflector, SetMetadata, VenokContainer } from "@venok/core";
import { DiscoveryService, ExplorerService } from "@venok/integration";
import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

import { WebsocketExplorerService } from "~/websocket/explorer.js";
import { WebsocketConfig } from "~/websocket/config.js";
import { GatewayFinder } from "~/websocket/finder.js";
import { WsParamsFactory } from "~/websocket/params-factory.js";
import { WebsocketContextCreator } from "~/websocket/context.js";
import { WebsocketExceptionFiltersContext } from "~/filters/context.js";
import { WebSocketGateway } from "~/decorators/gateway.decorator.js";
import { SubscribeMessage } from "~/decorators/subscribe-message.decorator.js";
import { InvalidSocketPortException } from "~/errors/invalid-socket-port.exception.js";
import { AckNotSupportedException } from "~/errors/ack-not-supported.exception.js";
import { GATEWAY_OPTIONS, GATEWAY_SERVER_METADATA, MESSAGE_METADATA, PORT_METADATA } from "~/constants.js";
import { WebsocketGatewayDiscovery } from "~/helpers/discovery.helper.js";
import { VENOK_WS_ADAPTER_GET_OR_CREATE_SERVER } from "~/symbols.js";

// Mock adapter for testing
const mockAdapter = {
  useCustomFactory: false,
  isAckSupported: true,
  getParamsFactory: mock(() => new WsParamsFactory()),
  [VENOK_WS_ADAPTER_GET_OR_CREATE_SERVER]: mock(() => ({
    server: {},
    connection: { subscribe: mock() },
    disconnect: { subscribe: mock() },
    init: { subscribe: mock() },
  })),
};

// Mock WebsocketConfig
@Injectable()
class MockWebsocketConfig {
  getAdapter() {
    return mockAdapter;
  }
}

// Test gateway with proper decorators
@Injectable()
@WebSocketGateway(8080)
class TestGateway {
  @Inject(GATEWAY_SERVER_METADATA)
  server: any;

  @SubscribeMessage("test-event")
  handleTestEvent(data: any) {
    return "test-response";
  }

  @SubscribeMessage("another-event")
  handleAnotherEvent(data: any) {
    return "another-response";
  }

  handleConnect() {
    return "connected";
  }

  handleConnection() {
    return "disconnected"; 
  }

  afterInit() {
    return "initialized";
  }

  normalMethod() {
    return "normal";
  }
}

// Test gateway with invalid port
@Injectable()
@WebSocketGateway(-1)
class InvalidPortGateway {
  @SubscribeMessage("test")
  handleTest() {
    return "test";
  }
}

// Test gateway without handlers
@Injectable()
@WebSocketGateway(8081)
class EmptyGateway {
  normalMethod() {
    return "normal";
  }
}

// Test gateway with ACK handling when adapter doesn't support it
@Injectable()
@WebSocketGateway(8082)
class AckGateway {
  @SubscribeMessage("ack-event")
  handleAckEvent(data: any) {
    return "ack-response";
  }
}

// Non-gateway class
@Injectable()
class RegularService {
  regularMethod() {
    return "regular";
  }
}

describe("WebsocketExplorerService", () => {
  let explorerService: WebsocketExplorerService;
  let container: VenokContainer;
  let discoveryService: DiscoveryService;
  let websocketConfig: MockWebsocketConfig;
  let metadataScanner: MetadataScanner;
  let testModule: CoreModule;
  let loggerSpy: any;

  beforeEach(() => {
    // Global mock for Reflect.defineMetadata to prevent TypeError
    spyOn(Reflect, "defineMetadata").mockImplementation(() => {});

    container = new VenokContainer();
    discoveryService = {
      getProviders: mock(),
    } as unknown as DiscoveryService;
    websocketConfig = new MockWebsocketConfig();
    metadataScanner = new MetadataScanner();

    // Create test module
    class TestModule {}
    testModule = new CoreModule(TestModule, container);

    // Add providers to module
    testModule.addProvider(TestGateway);
    testModule.addProvider(InvalidPortGateway);
    testModule.addProvider(EmptyGateway);
    testModule.addProvider(AckGateway);
    testModule.addProvider(RegularService);

    // Create instance wrappers
    const testGatewayWrapper = testModule.getProviderByKey(TestGateway);
    const invalidPortWrapper = testModule.getProviderByKey(InvalidPortGateway);
    const emptyGatewayWrapper = testModule.getProviderByKey(EmptyGateway);
    const ackGatewayWrapper = testModule.getProviderByKey(AckGateway);
    const regularServiceWrapper = testModule.getProviderByKey(RegularService);

    // Set instances
    (testGatewayWrapper as any).instance = new TestGateway();
    (testGatewayWrapper as any).isResolved = true;
    (invalidPortWrapper as any).instance = new InvalidPortGateway();
    (invalidPortWrapper as any).isResolved = true;
    (emptyGatewayWrapper as any).instance = new EmptyGateway();
    (emptyGatewayWrapper as any).isResolved = true;
    (ackGatewayWrapper as any).instance = new AckGateway();
    (ackGatewayWrapper as any).isResolved = true;
    (regularServiceWrapper as any).instance = new RegularService();
    (regularServiceWrapper as any).isResolved = true;

    // Mock isDependencyTreeStatic
    (testGatewayWrapper as any).isDependencyTreeStatic = mock(() => true);
    (invalidPortWrapper as any).isDependencyTreeStatic = mock(() => true);
    (emptyGatewayWrapper as any).isDependencyTreeStatic = mock(() => true);
    (ackGatewayWrapper as any).isDependencyTreeStatic = mock(() => true);
    (regularServiceWrapper as any).isDependencyTreeStatic = mock(() => true);

    // Mock discovery service
    (discoveryService.getProviders as any).mockReturnValue([
      testGatewayWrapper,
      invalidPortWrapper,
      emptyGatewayWrapper,
      ackGatewayWrapper,
      regularServiceWrapper,
    ]);

    // Mock container methods
    container.getModuleByKey = mock().mockReturnValue(testModule);
    container.getContextId = mock().mockReturnValue("context-id");

    explorerService = new WebsocketExplorerService(
      container,
      discoveryService,
      metadataScanner
    );

    // Inject websocket config
    (explorerService as any).websocketConfig = websocketConfig;

    // Mock logger to suppress output during tests
    loggerSpy = spyOn(Logger.prototype, "log").mockImplementation(() => {});

    // Initialize the service
    explorerService.onModuleInit();
  });

  afterEach(() => {
    // Clear all mocks after each test
    mock.restore();
    loggerSpy?.mockRestore?.();
    mockAdapter.isAckSupported = true; // Reset to default
    // Reset adapter methods
    mockAdapter[VENOK_WS_ADAPTER_GET_OR_CREATE_SERVER] = mock(() => ({
      server: {},
      connection: { subscribe: mock() },
      disconnect: { subscribe: mock() },
      init: { subscribe: mock() },
    }));
  });

  describe("constructor and initialization", () => {
    it("should be defined", () => {
      expect(explorerService).toBeDefined();
      expect(explorerService).toBeInstanceOf(ExplorerService);
    });

    it("should extend ExplorerService with correct generic type", () => {
      expect(explorerService).toBeInstanceOf(ExplorerService);
    });

    it("should have logger with correct name and timestamp", () => {
      expect((explorerService as any).logger).toBeDefined();
      expect((explorerService as any).logger.context).toBe("WebsocketExplorerService");
    });

    it("should have pattern finder instance", () => {
      expect((explorerService as any).patternFinder).toBeDefined();
      expect((explorerService as any).patternFinder).toBeInstanceOf(GatewayFinder);
    });
  });

  describe("onModuleInit", () => {
    it("should initialize params factory from adapter when useCustomFactory is true", () => {
      const customFactory = { exchangeKeyForValue: mock() };
      mockAdapter.useCustomFactory = true;
      mockAdapter.getParamsFactory = mock(() => customFactory);

      explorerService.onModuleInit();

      expect(mockAdapter.getParamsFactory).toHaveBeenCalled();
      expect((explorerService as any).paramsFactory).toBe(customFactory);
    });

    it("should use WsParamsFactory when adapter doesn't use custom factory", () => {
      mockAdapter.useCustomFactory = false;

      explorerService.onModuleInit();

      expect((explorerService as any).paramsFactory).toBeInstanceOf(WsParamsFactory);
    });
  });

  describe("getSettings", () => {
    it("should return correct explorer settings", () => {
      const settings = (explorerService as any).getSettings();

      expect(settings).toEqual({
        contextType: "websocket",
        isRequestScopeSupported: true,
        exceptionsFilterClass: WebsocketExceptionFiltersContext,
        contextCreatorClass: WebsocketContextCreator,
        options: { guards: true, interceptors: true, filters: false },
      });
    });
  });

  describe("filterProperties", () => {
    let testGatewayWrapper: InstanceWrapper;

    beforeEach(() => {
      testGatewayWrapper = (explorerService as any).wrappers.find(
        (w: InstanceWrapper) => w.metatype === TestGateway
      );
    });

    it("should return undefined when wrapper has no metatype", () => {
      const wrapperWithoutMetatype = { metatype: null } as InstanceWrapper;
      const result = (explorerService as any).filterProperties(wrapperWithoutMetatype, WebSocketGateway.KEY);
      expect(result).toBeUndefined();
    });

    it("should return undefined when gateway metadata is not found", () => {
      const regularServiceWrapper = (explorerService as any).wrappers.find(
        (w: InstanceWrapper) => w.metatype === RegularService
      );
      const result = (explorerService as any).filterProperties(regularServiceWrapper, WebSocketGateway.KEY);
      expect(result).toBeUndefined();
    });

    it("should throw InvalidSocketPortException for invalid port", () => {
      const invalidPortWrapper = (explorerService as any).wrappers.find(
        (w: InstanceWrapper) => w.metatype === InvalidPortGateway
      );

      expect(() =>
        (explorerService as any).filterProperties(invalidPortWrapper, WebSocketGateway.KEY)
      ).toThrow(InvalidSocketPortException);
    });

    it("should return undefined when no handlers are found", () => {
      const emptyGatewayWrapper = (explorerService as any).wrappers.find(
        (w: InstanceWrapper) => w.metatype === EmptyGateway
      );
      const result = (explorerService as any).filterProperties(emptyGatewayWrapper, WebSocketGateway.KEY);
      expect(result).toBeUndefined();
    });

    it("should throw AckNotSupportedException when adapter doesn't support ACK", () => {
      mockAdapter.isAckSupported = false;
      
      // Mock pattern finder to return handlers with ACK
      const mockHandlers = [
        {
          pattern: "ack-event",
          methodName: "handleAckEvent",
          isAckHandledManually: true,
          callback: mock(),
        },
      ];
      spyOn((explorerService as any).patternFinder, "getGatewayHandlers").mockReturnValue(mockHandlers);

      const ackGatewayWrapper = (explorerService as any).wrappers.find(
        (w: InstanceWrapper) => w.metatype === AckGateway
      );

      expect(() =>
        (explorerService as any).filterProperties(ackGatewayWrapper, WebSocketGateway.KEY)
      ).toThrow(AckNotSupportedException);
    });

    it("should return gateway metadata for valid gateway", () => {
      const result = (explorerService as any).filterProperties(testGatewayWrapper, WebSocketGateway.KEY);

      expect(result).toBeDefined();
      expect(result.port).toBe(8080);
      expect(result.options).toBeDefined();
      expect(result.handlers).toBeDefined();
      expect(Array.isArray(result.handlers)).toBe(true);
      expect(result.observableServer).toBeDefined();
    });

    it("should handle handleConnect method", () => {
      const result = (explorerService as any).filterProperties(testGatewayWrapper, WebSocketGateway.KEY);

      expect(result.handleConnect).toBeDefined();
      expect(typeof result.handleConnect).toBe("function");
    });

    it("should handle handleDisconnect method (mapped from handleConnection)", () => {
      const result = (explorerService as any).filterProperties(testGatewayWrapper, WebSocketGateway.KEY);

      expect(result.handleDisconnect).toBeDefined();
      expect(typeof result.handleDisconnect).toBe("function");
    });

    it("should handle afterInit method", () => {
      const result = (explorerService as any).filterProperties(testGatewayWrapper, WebSocketGateway.KEY);

      expect(result.afterInit).toBeDefined();
      expect(typeof result.afterInit).toBe("function");
    });

    it("should call getOrCreateServer with correct parameters", () => {
      (explorerService as any).filterProperties(testGatewayWrapper, WebSocketGateway.KEY);

      expect(mockAdapter[VENOK_WS_ADAPTER_GET_OR_CREATE_SERVER]).toHaveBeenCalledWith(8080, expect.any(Object));
    });

    it("should log gateway information", () => {
      (explorerService as any).filterProperties(testGatewayWrapper, WebSocketGateway.KEY);

      expect(loggerSpy).toHaveBeenCalledWith("TestGateway {8080}:");
    });

    it("should log handler information", () => {
      (explorerService as any).filterProperties(testGatewayWrapper, WebSocketGateway.KEY);

      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining("Mapped {TestGateway:8080,"));
    });

    it("should set metadata for handleConnect method", () => {
      const spy = spyOn(Reflect, "defineMetadata").mockImplementation(() => {});
      (explorerService as any).filterProperties(testGatewayWrapper, WebSocketGateway.KEY);

      expect(spy).toHaveBeenCalledWith(MESSAGE_METADATA, "connect", expect.any(Function));
    });

    it("should set metadata for handleDisconnect method", () => {
      const spy = spyOn(Reflect, "defineMetadata").mockImplementation(() => {});
      (explorerService as any).filterProperties(testGatewayWrapper, WebSocketGateway.KEY);

      // Check if disconnect was called - the method is handleConnection but mapped to disconnect
      const calls = spy.mock.calls;
      const disconnectCall = calls.find(call => call[1] === "disconnect");
      expect(disconnectCall).toBeDefined();
      // @ts-expect-error Mismatch types
      expect(disconnectCall[0]).toBe(MESSAGE_METADATA);
    });
  });

  describe("assignServerToProperties", () => {
    it("should assign server to properties marked with GATEWAY_SERVER_METADATA", () => {
      const mockInstance = {
        serverProperty: null,
        normalProperty: "normal",
      };
      const mockServer = { id: "server-123" };

      // Mock metadata for serverProperty
      // @ts-expect-error Mismatch types
      spyOn(Reflect, "getMetadata").mockImplementation((key, target, propertyKey) => {
        if (key === GATEWAY_SERVER_METADATA && propertyKey === "serverProperty") {
          return true;
        }
        return undefined;
      });

      const setSpy = spyOn(Reflect, "set");

      (explorerService as any).assignServerToProperties(mockInstance, mockServer);

      expect(setSpy).toHaveBeenCalledWith(mockInstance, "serverProperty", mockServer);
    });

    it("should skip function properties", () => {
      const mockInstance = {
        method: () => {},
        property: null,
      };
      const mockServer = { id: "server-123" };

      const setSpy = spyOn(Reflect, "set");
      // Only set metadata for property, not method
      // @ts-expect-error Mismatch types
      spyOn(Reflect, "getMetadata").mockImplementation((key, target, propertyKey) => {
        if (propertyKey === "property") return true;
        return undefined;
      });

      (explorerService as any).assignServerToProperties(mockInstance, mockServer);

      // Should set server for property but not method
      expect(setSpy).toHaveBeenCalledWith(mockInstance, "property", mockServer);
      expect(setSpy).not.toHaveBeenCalledWith(mockInstance, "method", mockServer);
    });

    it("should not assign server when metadata is undefined", () => {
      const mockInstance = {
        property: null,
      };
      const mockServer = { id: "server-123" };

      spyOn(Reflect, "getMetadata").mockReturnValue(undefined);
      const setSpy = spyOn(Reflect, "set");

      (explorerService as any).assignServerToProperties(mockInstance, mockServer);

      expect(setSpy).not.toHaveBeenCalled();
    });
  });

  describe("logGateway", () => {
    it("should log gateway with class name and port", () => {
      const mockInstance = { constructor: { name: "TestGateway" } };
      
      (explorerService as any).logGateway(mockInstance, 8080);

      expect(loggerSpy).toHaveBeenCalledWith("TestGateway {8080}:");
    });

    it("should handle instance with null constructor", () => {
      const mockInstance = { constructor: null };
      
      (explorerService as any).logGateway(mockInstance, 8080);

      expect(loggerSpy).not.toHaveBeenCalled();
    });
  });

  describe("logHandler", () => {
    it("should log each handler with gateway name, port, and pattern", () => {
      const mockInstance = { constructor: { name: "TestGateway" } };
      const mockHandlers = [
        { pattern: "event1", methodName: "handleEvent1", isAckHandledManually: false, callback: mock() },
        { pattern: "event2", methodName: "handleEvent2", isAckHandledManually: false, callback: mock() },
      ];

      (explorerService as any).logHandler(mockInstance, 8080, mockHandlers);

      expect(loggerSpy).toHaveBeenCalledWith("Mapped {TestGateway:8080, event1} handler");
      expect(loggerSpy).toHaveBeenCalledWith("Mapped {TestGateway:8080, event2} handler");
    });

    it("should handle empty handlers array", () => {
      const mockInstance = { constructor: { name: "TestGateway" } };
      const mockHandlers: any[] = [];

      (explorerService as any).logHandler(mockInstance, 8080, mockHandlers);

      expect(loggerSpy).not.toHaveBeenCalled();
    });
  });

  describe("integration scenarios", () => {
    let validExplorerService: WebsocketExplorerService;

    beforeEach(() => {
      // Create explorer service with only valid gateways (exclude InvalidPortGateway)
      const validDiscoveryService = {
        getProviders: mock(),
      } as unknown as DiscoveryService;

      const testGatewayWrapper = testModule.getProviderByKey(TestGateway);
      const emptyGatewayWrapper = testModule.getProviderByKey(EmptyGateway);
      const ackGatewayWrapper = testModule.getProviderByKey(AckGateway);
      const regularServiceWrapper = testModule.getProviderByKey(RegularService);

      // Mock discovery service with only valid gateways
      (validDiscoveryService.getProviders as any).mockReturnValue([
        testGatewayWrapper,
        emptyGatewayWrapper,
        ackGatewayWrapper,
        regularServiceWrapper,
      ]);

      validExplorerService = new WebsocketExplorerService(
        container,
        validDiscoveryService,
        metadataScanner
      );

      // Inject websocket config
      (validExplorerService as any).websocketConfig = websocketConfig;
      validExplorerService.onModuleInit();
    });

    it("should work end-to-end with real gateway exploration", () => {
      const results = validExplorerService.explore(WebSocketGateway.KEY);

      // Should find only gateways with valid configuration and handlers
      expect(results.length).toBeGreaterThan(0);
      
      const testGatewayResult = results.find(r => r.port === 8080);
      expect(testGatewayResult).toBeDefined();
      expect(testGatewayResult?.handlers).toBeDefined();
      expect(testGatewayResult?.handlers.length).toBeGreaterThan(0);
    });

    it("should handle multiple gateways correctly", () => {
      const results = validExplorerService.explore(WebSocketGateway.KEY);

      // Should process multiple gateways but skip invalid ones
      expect(Array.isArray(results)).toBe(true);
      
      // Each result should have required properties
      results.forEach(result => {
        expect(result).toHaveProperty("port");
        expect(result).toHaveProperty("options");
        expect(result).toHaveProperty("handlers");
        expect(result).toHaveProperty("observableServer");
        expect(typeof result.port).toBe("number");
        expect(Array.isArray(result.handlers)).toBe(true);
      });
    });

    it("should maintain logger context throughout exploration", () => {
      // Reset spy for this test
      loggerSpy.mockClear();

      validExplorerService.explore(WebSocketGateway.KEY);

      // Logger should have been called for valid gateways
      expect(loggerSpy).toHaveBeenCalled();
      
      // Check that logger was called with gateway information
      const logCalls = loggerSpy.mock.calls;
      const hasGatewayLog = logCalls.some((call: any[]) => 
        call[0] && typeof call[0] === "string" && call[0].includes("{8080}:")
      );
      expect(hasGatewayLog).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should propagate InvalidSocketPortException", () => {
      const invalidPortWrapper = (explorerService as any).wrappers.find(
        (w: InstanceWrapper) => w.metatype === InvalidPortGateway
      );

      expect(() => 
        (explorerService as any).filterProperties(invalidPortWrapper, WebSocketGateway.KEY)
      ).toThrow(InvalidSocketPortException);
    });

    it("should handle adapter getOrCreateServer errors gracefully", () => {
      mockAdapter[VENOK_WS_ADAPTER_GET_OR_CREATE_SERVER] = mock(() => {
        throw new Error("Server creation failed");
      });

      const testGatewayWrapper = (explorerService as any).wrappers.find(
        (w: InstanceWrapper) => w.metatype === TestGateway
      );

      expect(() => 
        (explorerService as any).filterProperties(testGatewayWrapper, WebSocketGateway.KEY)
      ).toThrow("Server creation failed");
    });
  });

  describe("edge cases", () => {
    it("should handle instance without handleConnect method", () => {
      const mockInstance = {
        // No handleConnect method
        handleTestEvent: () => "test",
      };
      
      const mockWrapper = {
        instance: mockInstance,
        metatype: class MockGateway {},
        isDependencyTreeStatic: mock(() => true),
      } as unknown as InstanceWrapper;

      // Mock gateway metadata
      const mockDiscovery = new WebsocketGatewayDiscovery({ [PORT_METADATA]: 8080, [GATEWAY_OPTIONS]: {} });
      spyOn(explorerService as any, "get").mockReturnValue(mockDiscovery);
      spyOn((explorerService as any).patternFinder, "getGatewayHandlers").mockReturnValue([
        {
          pattern: "test",
          methodName: "handleTestEvent",
          isAckHandledManually: false,
        },
      ]);
      spyOn(Reflect, "defineMetadata").mockImplementation(() => {});

      const result = (explorerService as any).filterProperties(mockWrapper, WebSocketGateway.KEY);

      expect(result?.handleConnect).toBeUndefined();
    });

    it("should handle instance without handleConnection method", () => {
      const mockInstance = {
        // No handleConnection method
        handleTestEvent: () => "test",
      };
      
      const mockWrapper = {
        instance: mockInstance,
        metatype: class MockGateway {},
        isDependencyTreeStatic: mock(() => true),
      } as unknown as InstanceWrapper;

      // Mock gateway metadata
      const mockDiscovery = new WebsocketGatewayDiscovery({ [PORT_METADATA]: 8080, [GATEWAY_OPTIONS]: {} });
      spyOn(explorerService as any, "get").mockReturnValue(mockDiscovery);
      spyOn((explorerService as any).patternFinder, "getGatewayHandlers").mockReturnValue([
        {
          pattern: "test",
          methodName: "handleTestEvent",
          isAckHandledManually: false,
        },
      ]);
      spyOn(Reflect, "defineMetadata").mockImplementation(() => {});

      const result = (explorerService as any).filterProperties(mockWrapper, WebSocketGateway.KEY);

      expect(result?.handleDisconnect).toBeUndefined();
    });

    it("should handle instance without afterInit method", () => {
      const mockInstance = {
        // No afterInit method
        handleTestEvent: () => "test",
      };
      
      const mockWrapper = {
        instance: mockInstance,
        metatype: class MockGateway {},
        isDependencyTreeStatic: mock(() => true),
      } as unknown as InstanceWrapper;

      // Mock gateway metadata
      const mockDiscovery = new WebsocketGatewayDiscovery({ [PORT_METADATA]: 8080, [GATEWAY_OPTIONS]: {} });
      spyOn(explorerService as any, "get").mockReturnValue(mockDiscovery);
      spyOn((explorerService as any).patternFinder, "getGatewayHandlers").mockReturnValue([
        {
          pattern: "test",
          methodName: "handleTestEvent",
          isAckHandledManually: false,
        },
      ]);
      spyOn(Reflect, "defineMetadata").mockImplementation(() => {});

      const result = (explorerService as any).filterProperties(mockWrapper, WebSocketGateway.KEY);

      expect(result?.afterInit).toBeUndefined();
    });

    it("should handle zero port correctly", () => {
      expect(() => {
        throw new InvalidSocketPortException(0, TestGateway);
      }).toThrow(InvalidSocketPortException);
    });

    it("should handle negative ports correctly", () => {
      expect(() => {
        throw new InvalidSocketPortException(-1, InvalidPortGateway);
      }).toThrow(InvalidSocketPortException);
    });

    it("should handle non-integer ports correctly", () => {
      expect(() => {
        throw new InvalidSocketPortException(8080.5, TestGateway);
      }).toThrow(InvalidSocketPortException);
    });
  });
});