import type { AdapterRouteMetadata } from "~/interfaces/index.js";

import { beforeEach, describe, expect, it } from "bun:test";

import { ControllerDiscovery, RouteDiscovery, VenokBaseDiscovery } from "~/helpers/discovery.helper.js";
import { HOST_METADATA, PATH_METADATA, VERSION_METADATA } from "~/constants.js";
import { HttpMethod } from "~/enums/method.enum.js";

const defaultRouteDiscoveryMetadata = {
  versioningOptions: undefined,
  hosts: undefined,
  useVersionFilter: true,
  useHostFilter: true,
  handlers: [],
};

class TestVenokBaseDiscovery extends VenokBaseDiscovery {}

describe("Discovery Helper", () => {
  describe("VenokBaseDiscovery", () => {
    let discovery: VenokBaseDiscovery<{ test: string }>;
    const mockMeta = { test: "value" };

    beforeEach(() => {
      discovery = new TestVenokBaseDiscovery(mockMeta);
    });

    it("should create instance with meta", () => {
      expect(discovery).toBeInstanceOf(VenokBaseDiscovery);
      expect(discovery.getMeta()).toEqual(mockMeta);
    });

    it("should get meta data", () => {
      expect(discovery.getMeta()).toEqual({ test: "value" });
    });

    it("should set and get discovery data", () => {
      const mockDiscovery = {
        class: class TestClass {},
        handler: () => "test",
      };

      discovery.setDiscovery(mockDiscovery);

      expect(discovery.getClass()).toBe(mockDiscovery.class);
      expect(discovery.getHandler()).toBe(mockDiscovery.handler);
    });

    it("should set discovery only once", () => {
      const firstDiscovery = {
        class: class FirstClass {},
        handler: () => "first",
      };

      const secondDiscovery = {
        class: class SecondClass {},
        handler: () => "second",
      };

      discovery.setDiscovery(firstDiscovery);
      discovery.setDiscovery(secondDiscovery);

      expect(discovery.getClass()).toBe(firstDiscovery.class);
      expect(discovery.getHandler()).toBe(firstDiscovery.handler);
    });

    it("should handle undefined handler", () => {
      const mockDiscovery = {
        class: class TestClass {},
      };

      discovery.setDiscovery(mockDiscovery);

      expect(discovery.getClass()).toBe(mockDiscovery.class);
      expect(discovery.getHandler()).toBeUndefined();
    });

    it("should handle complex meta objects", () => {
      const complexMeta = {
        nested: { prop: "value" },
        array: [1, 2, 3],
        func: () => "test",
      };

      const complexDiscovery = new TestVenokBaseDiscovery(complexMeta);
      expect(complexDiscovery.getMeta()).toEqual(complexMeta);
    });

    it("should handle null meta", () => {
      const nullDiscovery = new TestVenokBaseDiscovery(null);
      expect(nullDiscovery.getMeta()).toBeNull();
    });

    it("should handle undefined meta", () => {
      const undefinedDiscovery = new TestVenokBaseDiscovery(undefined);
      expect(undefinedDiscovery.getMeta()).toBeUndefined();
    });
  });

  describe("RouteDiscovery", () => {
    it("should create instance extending VenokBaseDiscovery", () => {
      const routeMeta: AdapterRouteMetadata & { path: string } = {
        path: "/users",
        method: HttpMethod.GET,
        ...defaultRouteDiscoveryMetadata,
      };

      const routeDiscovery = new RouteDiscovery(routeMeta);

      expect(routeDiscovery).toBeInstanceOf(VenokBaseDiscovery);
      expect(routeDiscovery).toBeInstanceOf(RouteDiscovery);
      expect(routeDiscovery.getMeta()).toEqual(routeMeta);
    });

    it("should inherit all base functionality", () => {
      const routeMeta: AdapterRouteMetadata & { path: string } = {
        path: "/test",
        method: HttpMethod.POST,
        ...defaultRouteDiscoveryMetadata,
      };
      const routeDiscovery = new RouteDiscovery(routeMeta);

      const mockDiscovery = {
        class: class TestController {},
        handler: () => "route handler",
      };

      routeDiscovery.setDiscovery(mockDiscovery);

      expect(routeDiscovery.getClass()).toBe(mockDiscovery.class);
      expect(routeDiscovery.getHandler()).toBe(mockDiscovery.handler);
    });
  });

  describe("ControllerDiscovery", () => {
    let controllerDiscovery: ControllerDiscovery;
    let mockMeta: any;

    beforeEach(() => {
      mockMeta = {
        [PATH_METADATA]: "/users",
        [HOST_METADATA]: "api.example.com",
        [VERSION_METADATA]: "1",
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      controllerDiscovery = new ControllerDiscovery(mockMeta);
    });

    it("should create instance extending VenokBaseDiscovery", () => {
      expect(controllerDiscovery).toBeInstanceOf(VenokBaseDiscovery);
      expect(controllerDiscovery).toBeInstanceOf(ControllerDiscovery);
    });

    it("should get prefixes", () => {
      expect(controllerDiscovery.getPrefixes()).toBe("/users");
    });

    it("should get host", () => {
      expect(controllerDiscovery.getHost()).toBe("api.example.com");
    });


    it("should get version", () => {
      expect(controllerDiscovery.getVersion()).toBe("1");
    });

    it("should handle array prefixes", () => {
      const arrayMeta = {
        [PATH_METADATA]: ["/users", "/api/users"],
        [HOST_METADATA]: undefined,
        [VERSION_METADATA]: undefined,
      };

      const discovery = new ControllerDiscovery(arrayMeta);
      expect(discovery.getPrefixes()).toEqual(["/users", "/api/users"]);
    });

    it("should handle RegExp host", () => {
      const hostRegex = /.*\.example\.com$/;
      const regexMeta = {
        [PATH_METADATA]: "/users",
        [HOST_METADATA]: hostRegex,
        [VERSION_METADATA]: undefined,
      };

      const discovery = new ControllerDiscovery(regexMeta);
      expect(discovery.getHost()).toBe(hostRegex);
    });

    it("should handle array of hosts", () => {
      const hostArray = ["api.example.com", /.*\\.test\\.com$/];
      const arrayHostMeta = {
        [PATH_METADATA]: "/users",
        [HOST_METADATA]: hostArray,
        [VERSION_METADATA]: undefined,
      };

      const discovery = new ControllerDiscovery(arrayHostMeta);
      expect(discovery.getHost()).toEqual(hostArray);
    });

    it("should handle array versions", () => {
      const versionMeta = {
        [PATH_METADATA]: "/users",
        [HOST_METADATA]: undefined,
        [VERSION_METADATA]: ["1", "2", "3"],
      };

      const discovery = new ControllerDiscovery(versionMeta);
      expect(discovery.getVersion()).toEqual(["1", "2", "3"]);
    });

    it("should handle symbol versions", () => {
      const symbolVersion = Symbol("v1");
      const symbolMeta = {
        [PATH_METADATA]: "/users",
        [HOST_METADATA]: undefined,
        [VERSION_METADATA]: symbolVersion,
      };

      // @ts-expect-error Mismatch types
      const discovery = new ControllerDiscovery(symbolMeta);
      // @ts-expect-error Mismatch types
      expect(discovery.getVersion()).toBe(symbolVersion);
    });

    it("should handle undefined metadata values", () => {
      const undefinedMeta = {
        [PATH_METADATA]: undefined,
        [HOST_METADATA]: undefined,
        [VERSION_METADATA]: undefined,
      };

      // @ts-expect-error Mismatch types
      const discovery = new ControllerDiscovery(undefinedMeta);
      expect(discovery.getPrefixes()).toBeUndefined();
      expect(discovery.getHost()).toBeUndefined();
      expect(discovery.getVersion()).toBeUndefined();
    });


    describe("Route Items Management", () => {
      it("should start with empty items", () => {
        expect(controllerDiscovery.getItems()).toEqual([]);
      });

      it("should add route items", () => {
        const routeMeta = {
          path: "/create",
          method: HttpMethod.POST,
          ...defaultRouteDiscoveryMetadata,
        };
        const routeDiscovery = new RouteDiscovery(routeMeta);

        controllerDiscovery.pushItem(routeDiscovery);

        expect(controllerDiscovery.getItems()).toHaveLength(1);
        expect(controllerDiscovery.getItems()[0]).toBe(routeDiscovery);
      });

      it("should add multiple route items", () => {
        const route1 = new RouteDiscovery({ path: "/create", method: HttpMethod.POST, ...defaultRouteDiscoveryMetadata });
        const route2 = new RouteDiscovery({ path: "/update", method: HttpMethod.PUT, ...defaultRouteDiscoveryMetadata });
        const route3 = new RouteDiscovery({ path: "/delete", method: HttpMethod.DELETE, ...defaultRouteDiscoveryMetadata });

        controllerDiscovery.pushItem(route1);
        controllerDiscovery.pushItem(route2);
        controllerDiscovery.pushItem(route3);

        const items = controllerDiscovery.getItems();
        expect(items).toHaveLength(3);
        expect(items[0]).toBe(route1);
        expect(items[1]).toBe(route2);
        expect(items[2]).toBe(route3);
      });

      it("should maintain items order", () => {
        const routes = [];
        for (let i = 0; i < 10; i++) {
          const route = new RouteDiscovery({ path: `/route${i}`, method: HttpMethod.GET, ...defaultRouteDiscoveryMetadata });
          routes.push(route);
          controllerDiscovery.pushItem(route);
        }

        const items = controllerDiscovery.getItems();
        expect(items).toHaveLength(10);
        
        routes.forEach((route, index) => {
          expect(items[index]).toBe(route);
        });
      });

      it("should allow same route to be added multiple times", () => {
        const route = new RouteDiscovery({ path: "/test", method: HttpMethod.GET, ...defaultRouteDiscoveryMetadata });

        controllerDiscovery.pushItem(route);
        controllerDiscovery.pushItem(route);

        expect(controllerDiscovery.getItems()).toHaveLength(2);
        expect(controllerDiscovery.getItems()[0]).toBe(route);
        expect(controllerDiscovery.getItems()[1]).toBe(route);
      });
    });

    it("should inherit base discovery functionality", () => {
      const mockDiscovery = {
        class: class UserController {},
        handler: () => "controller handler",
      };

      controllerDiscovery.setDiscovery(mockDiscovery);

      expect(controllerDiscovery.getClass()).toBe(mockDiscovery.class);
      expect(controllerDiscovery.getHandler()).toBe(mockDiscovery.handler);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(controllerDiscovery.getMeta()).toEqual(mockMeta);
    });
  });

  describe("Integration scenarios", () => {
    it("should handle complete controller with routes setup", () => {
      const controllerMeta = {
        [PATH_METADATA]: "/api/users",
        [HOST_METADATA]: "api.example.com",
        [VERSION_METADATA]: ["1", "2"],
      };

      const controller = new ControllerDiscovery(controllerMeta);

      // Add controller class
      const controllerClass = class UserController {
        getUsers() { return []; }
        createUser() { return {}; }
      };

      controller.setDiscovery({ class: controllerClass });

      // Add routes
      const getRoute = new RouteDiscovery({ path: "", method: HttpMethod.GET, ...defaultRouteDiscoveryMetadata });
      const postRoute = new RouteDiscovery({ path: "", method: HttpMethod.POST, ...defaultRouteDiscoveryMetadata });

      getRoute.setDiscovery({ 
        class: controllerClass, 
        handler: controllerClass.prototype.getUsers, 
      });
      
      postRoute.setDiscovery({ 
        class: controllerClass, 
        handler: controllerClass.prototype.createUser, 
      });

      controller.pushItem(getRoute);
      controller.pushItem(postRoute);

      // Verify controller setup
      expect(controller.getClass()).toBe(controllerClass);
      expect(controller.getPrefixes()).toBe("/api/users");
      expect(controller.getHost()).toBe("api.example.com");
      expect(controller.getVersion()).toEqual(["1", "2"]);
      
      // Verify routes
      expect(controller.getItems()).toHaveLength(2);
      expect(controller.getItems()[0].getHandler()).toBe(controllerClass.prototype.getUsers);
      expect(controller.getItems()[1].getHandler()).toBe(controllerClass.prototype.createUser);
    });

    it("should handle minimal controller setup", () => {
      const minimalMeta = {
        [PATH_METADATA]: "/",
        [HOST_METADATA]: undefined,
        [VERSION_METADATA]: undefined,
      };

      const controller = new ControllerDiscovery(minimalMeta);

      expect(controller.getPrefixes()).toBe("/");
      expect(controller.getHost()).toBeUndefined();
      expect(controller.getVersion()).toBeUndefined();
      expect(controller.getItems()).toEqual([]);
    });
  });
});