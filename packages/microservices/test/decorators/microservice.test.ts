import { describe, expect, it } from "bun:test";
import { Scope, SCOPE_OPTIONS_METADATA } from "@venok/core";

import { Microservice } from "~/decorators/microservice.decorator.js";

describe("@Microservice", () => {
  it("should set default scope metadata when no options provided", () => {
    @Microservice()
    class TestMicroservice {}

    const scopeOptions = Reflect.getMetadata(SCOPE_OPTIONS_METADATA, TestMicroservice);
    
    expect(scopeOptions).toEqual({ scope: Scope.DEFAULT, durable: false });
  });

  it("should set scope metadata when scope option provided", () => {
    @Microservice({ scope: Scope.REQUEST })
    class TestMicroservice {}

    const scopeOptions = Reflect.getMetadata(SCOPE_OPTIONS_METADATA, TestMicroservice);
    
    expect(scopeOptions).toEqual({ scope: Scope.REQUEST, durable: false });
  });

  it("should set durable metadata when durable option provided", () => {
    @Microservice({ durable: true })
    class TestMicroservice {}

    const scopeOptions = Reflect.getMetadata(SCOPE_OPTIONS_METADATA, TestMicroservice);
    
    expect(scopeOptions).toEqual({ scope: Scope.DEFAULT, durable: true });
  });

  it("should set both scope and durable metadata when both options provided", () => {
    @Microservice({ 
      scope: Scope.TRANSIENT, 
      durable: true, 
    })
    class TestMicroservice {}

    const scopeOptions = Reflect.getMetadata(SCOPE_OPTIONS_METADATA, TestMicroservice);
    
    expect(scopeOptions).toEqual({ scope: Scope.TRANSIENT, durable: true });
  });

  it("should handle REQUEST scope with durable false", () => {
    @Microservice({ 
      scope: Scope.REQUEST, 
      durable: false, 
    })
    class TestMicroservice {}

    const scopeOptions = Reflect.getMetadata(SCOPE_OPTIONS_METADATA, TestMicroservice);
    
    expect(scopeOptions).toEqual({ scope: Scope.REQUEST, durable: false });
  });

  it("should have KEY property", () => {
    expect(Microservice.KEY).toBeDefined();
    expect(typeof Microservice.KEY).toBe("string");
  });
});