 
import { describe, expect, it, afterEach } from "bun:test";

import { WebSocketGateway } from "~/decorators/gateway.decorator.js";
import { GATEWAY_METADATA, GATEWAY_OPTIONS, PORT_METADATA } from "~/constants.js";
import { WebsocketGatewayDiscovery } from "~/helpers/discovery.helper.js";

describe("@WebSocketGateway", () => {
  let reflectorSpy: any;

  afterEach(() => {
    reflectorSpy?.mockRestore?.();
  });

  describe("with port only", () => {
    @WebSocketGateway(8080)
    class TestGatewayWithPort {}

    it("should enhance class with gateway metadata using port", () => {
      const metadata = Reflect.getMetadata(GATEWAY_METADATA, TestGatewayWithPort);
      
      expect(metadata).toBeInstanceOf(WebsocketGatewayDiscovery);
      expect(metadata.getPort()).toBe(8080);
      expect(metadata.getOptions()).toEqual({});
    });
  });

  describe("with options only", () => {
    const options = { path: "/ws" };
    
    @WebSocketGateway(options)
    class TestGatewayWithOptions {}

    it("should enhance class with gateway metadata using options", () => {
      const metadata = Reflect.getMetadata(GATEWAY_METADATA, TestGatewayWithOptions);
      
      expect(metadata).toBeInstanceOf(WebsocketGatewayDiscovery);
      expect(metadata.getPort()).toBe(0);
      expect(metadata.getOptions()).toEqual(options);
    });
  });

  describe("with port and options", () => {
    const options = { path: "/websocket" };
    
    @WebSocketGateway(3000, options)
    class TestGatewayWithPortAndOptions {}

    it("should enhance class with gateway metadata using port and options", () => {
      const metadata = Reflect.getMetadata(GATEWAY_METADATA, TestGatewayWithPortAndOptions);
      
      expect(metadata).toBeInstanceOf(WebsocketGatewayDiscovery);
      expect(metadata.getPort()).toBe(3000);
      expect(metadata.getOptions()).toEqual(options);
    });
  });

  describe("with no parameters", () => {
    @WebSocketGateway()
    class TestGatewayEmpty {}

    it("should enhance class with default metadata when no parameters", () => {
      const metadata = Reflect.getMetadata(GATEWAY_METADATA, TestGatewayEmpty);
      
      expect(metadata).toBeInstanceOf(WebsocketGatewayDiscovery);
      expect(metadata.getPort()).toBe(0);
      expect(metadata.getOptions()).toEqual({});
    });
  });

  describe("edge cases", () => {
    it("should handle zero port correctly", () => {
      @WebSocketGateway(0)
      class TestGatewayZeroPort {}

      const metadata = Reflect.getMetadata(GATEWAY_METADATA, TestGatewayZeroPort);
      
      expect(metadata.getPort()).toBe(0);
      expect(metadata.getOptions()).toEqual({});
    });

    it("should handle negative port (not a valid port)", () => {
      @WebSocketGateway(-1)
      class TestGatewayNegativePort {}

      const metadata = Reflect.getMetadata(GATEWAY_METADATA, TestGatewayNegativePort);
      
      expect(metadata.getPort()).toBe(-1);
      expect(metadata.getOptions()).toEqual({});
    });

    it("should handle non-integer number", () => {
      @WebSocketGateway(3.14)
      class TestGatewayFloatPort {}

      const metadata = Reflect.getMetadata(GATEWAY_METADATA, TestGatewayFloatPort);
      
      expect(metadata.getPort()).toBe(0);
      expect(metadata.getOptions()).toEqual(3.14);
    });

    it("should handle empty options object", () => {
      @WebSocketGateway({})
      class TestGatewayEmptyOptions {}

      const metadata = Reflect.getMetadata(GATEWAY_METADATA, TestGatewayEmptyOptions);
      
      expect(metadata.getPort()).toBe(0);
      expect(metadata.getOptions()).toEqual({});
    });

    it("should handle null as options", () => {
      @WebSocketGateway(null as any)
      class TestGatewayNullOptions {}

      const metadata = Reflect.getMetadata(GATEWAY_METADATA, TestGatewayNullOptions);
      
      expect(metadata.getPort()).toBe(0);
      expect(metadata.getOptions()).toEqual({});
    });

    it("should handle undefined as options", () => {
      @WebSocketGateway(undefined as any)
      class TestGatewayUndefinedOptions {}

      const metadata = Reflect.getMetadata(GATEWAY_METADATA, TestGatewayUndefinedOptions);
      
      expect(metadata.getPort()).toBe(0);
      expect(metadata.getOptions()).toEqual({});
    });
  });

  describe("metadata structure", () => {
    const options = { path: "/test", customProperty: "value" };
    
    @WebSocketGateway(9999, options)
    class TestMetadataStructure {}

    it("should store metadata with correct structure", () => {
      const metadata = Reflect.getMetadata(GATEWAY_METADATA, TestMetadataStructure);
      const metaData = metadata.getMeta();
      
      expect(metaData).toHaveProperty(PORT_METADATA);
      expect(metaData).toHaveProperty(GATEWAY_OPTIONS);
      expect(metaData[PORT_METADATA]).toBe(9999);
      expect(metaData[GATEWAY_OPTIONS]).toEqual(options);
    });
  });

  describe("decorator KEY property", () => {
    it("should have KEY property on the decorator function", () => {
      expect(WebSocketGateway).toHaveProperty("KEY");
      expect(typeof WebSocketGateway["KEY"]).toBe("string");
      expect(WebSocketGateway["KEY"]).toBe(GATEWAY_METADATA);
    });
  });

  describe("method overloads", () => {
    it("should work with port overload", () => {
      const decorator = WebSocketGateway(8080);
      expect(typeof decorator).toBe("function");
    });

    it("should work with options overload", () => {
      const decorator = WebSocketGateway({ path: "/ws" });
      expect(typeof decorator).toBe("function");
    });

    it("should work with port and options overload", () => {
      const decorator = WebSocketGateway(8080, { path: "/ws" });
      expect(typeof decorator).toBe("function");
    });
  });

  describe("class decoration", () => {
    it("should return a ClassDecorator function", () => {
      const decorator = WebSocketGateway(8080);
      expect(typeof decorator).toBe("function");
      
      @decorator
      class TestClass {}
      
      const metadata = Reflect.getMetadata(GATEWAY_METADATA, TestClass);
      expect(metadata).toBeInstanceOf(WebsocketGatewayDiscovery);
    });

    it("should work with complex gateway options", () => {
      const complexOptions = {
        path: "/complex",
        namespace: "/admin",
        cors: true,
        transports: ["websocket", "polling"],
      };
      
      @WebSocketGateway(4000, complexOptions as any)
      class ComplexGateway {}
      
      const metadata = Reflect.getMetadata(GATEWAY_METADATA, ComplexGateway);
      expect(metadata.getPort()).toBe(4000);
      expect(metadata.getOptions()).toEqual(complexOptions);
    });
  });
});