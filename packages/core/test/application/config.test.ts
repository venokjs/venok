/* eslint-disable @typescript-eslint/no-unsafe-argument*/

import type { VenokInterceptor } from "~/interfaces/index.js";

import { beforeEach, describe, expect, it } from "bun:test";

import { ApplicationConfig } from "~/application/config.js";
import { InstanceWrapper } from "~/injector/instance/wrapper.js";

describe("ApplicationConfig", () => {
  let config: ApplicationConfig;

  beforeEach(() => {
    config = new ApplicationConfig();
  });

  describe("Global Pipes", () => {
    it("should start with empty global pipes array", () => {
      expect(config.getGlobalPipes()).toEqual([]);
    });

    it("should add a single global pipe", () => {
      const pipe = { transform: (value: any) => value };
      
      config.addGlobalPipe(pipe);
      
      expect(config.getGlobalPipes()).toEqual([pipe]);
    });

    it("should use multiple global pipes", () => {
      const pipe1 = { transform: (value: any) => value };
      const pipe2 = { transform: (value: any) => value.toString() };
      
      config.useGlobalPipes(pipe1, pipe2);
      
      expect(config.getGlobalPipes()).toEqual([pipe1, pipe2]);
    });

    it("should concatenate pipes when using useGlobalPipes multiple times", () => {
      const pipe1 = { transform: (value: any) => value };
      const pipe2 = { transform: (value: any) => value.toString() };
      const pipe3 = { transform: (value: any) => value.toLowerCase() };
      
      config.useGlobalPipes(pipe1);
      config.useGlobalPipes(pipe2, pipe3);
      
      expect(config.getGlobalPipes()).toEqual([pipe1, pipe2, pipe3]);
    });

    it("should preserve existing pipes when adding new ones", () => {
      const pipe1 = { transform: (value: any) => value };
      const pipe2 = { transform: (value: any) => value.toString() };
      
      config.addGlobalPipe(pipe1);
      config.addGlobalPipe(pipe2);
      
      expect(config.getGlobalPipes()).toEqual([pipe1, pipe2]);
    });
  });

  describe("Global Filters", () => {
    it("should start with empty global filters array", () => {
      expect(config.getGlobalFilters()).toEqual([]);
    });

    it("should add a single global filter", () => {
      const filter = { catch: () => {} };
      
      config.addGlobalFilter(filter);
      
      expect(config.getGlobalFilters()).toEqual([filter]);
    });

    it("should use multiple global filters", () => {
      const filter1 = { catch: () => {} };
      const filter2 = { catch: () => {} };
      
      config.useGlobalFilters(filter1, filter2);
      
      expect(config.getGlobalFilters()).toEqual([filter1, filter2]);
    });

    it("should concatenate filters when using useGlobalFilters multiple times", () => {
      const filter1 = { catch: () => {} };
      const filter2 = { catch: () => {} };
      const filter3 = { catch: () => {} };
      
      config.useGlobalFilters(filter1);
      config.useGlobalFilters(filter2, filter3);
      
      expect(config.getGlobalFilters()).toEqual([filter1, filter2, filter3]);
    });

    it("should preserve existing filters when adding new ones", () => {
      const filter1 = { catch: () => {} };
      const filter2 = { catch: () => {} };
      
      config.addGlobalFilter(filter1);
      config.addGlobalFilter(filter2);
      
      expect(config.getGlobalFilters()).toEqual([filter1, filter2]);
    });
  });

  describe("Global Interceptors", () => {
    it("should start with empty global interceptors array", () => {
      expect(config.getGlobalInterceptors()).toEqual([]);
    });

    it("should add a single global interceptor", () => {
      const interceptor: VenokInterceptor = { intercept: () => {} } as any;
      
      config.addGlobalInterceptor(interceptor);
      
      expect(config.getGlobalInterceptors()).toEqual([interceptor]);
    });

    it("should use multiple global interceptors", () => {
      const interceptor1: VenokInterceptor = { intercept: () => {} } as any;
      const interceptor2: VenokInterceptor = { intercept: () => {} } as any;
      
      config.useGlobalInterceptors(interceptor1, interceptor2);
      
      expect(config.getGlobalInterceptors()).toEqual([interceptor1, interceptor2]);
    });

    it("should concatenate interceptors when using useGlobalInterceptors multiple times", () => {
      const interceptor1: VenokInterceptor = { intercept: () => {} } as any;
      const interceptor2: VenokInterceptor = { intercept: () => {} } as any;
      const interceptor3: VenokInterceptor = { intercept: () => {} } as any;
      
      config.useGlobalInterceptors(interceptor1);
      config.useGlobalInterceptors(interceptor2, interceptor3);
      
      expect(config.getGlobalInterceptors()).toEqual([interceptor1, interceptor2, interceptor3]);
    });

    it("should preserve existing interceptors when adding new ones", () => {
      const interceptor1: VenokInterceptor = { intercept: () => {} } as any;
      const interceptor2: VenokInterceptor = { intercept: () => {} } as any;
      
      config.addGlobalInterceptor(interceptor1);
      config.addGlobalInterceptor(interceptor2);
      
      expect(config.getGlobalInterceptors()).toEqual([interceptor1, interceptor2]);
    });
  });

  describe("Global Guards", () => {
    it("should start with empty global guards array", () => {
      expect(config.getGlobalGuards()).toEqual([]);
    });

    it("should add a single global guard", () => {
      const guard = { canActivate: () => true };
      
      config.addGlobalGuard(guard);
      
      expect(config.getGlobalGuards()).toEqual([guard]);
    });

    it("should use multiple global guards", () => {
      const guard1 = { canActivate: () => true };
      const guard2 = { canActivate: () => false };
      
      config.useGlobalGuards(guard1, guard2);
      
      expect(config.getGlobalGuards()).toEqual([guard1, guard2]);
    });

    it("should concatenate guards when using useGlobalGuards multiple times", () => {
      const guard1 = { canActivate: () => true };
      const guard2 = { canActivate: () => false };
      const guard3 = { canActivate: () => true };
      
      config.useGlobalGuards(guard1);
      config.useGlobalGuards(guard2, guard3);
      
      expect(config.getGlobalGuards()).toEqual([guard1, guard2, guard3]);
    });

    it("should preserve existing guards when adding new ones", () => {
      const guard1 = { canActivate: () => true };
      const guard2 = { canActivate: () => false };
      
      config.addGlobalGuard(guard1);
      config.addGlobalGuard(guard2);
      
      expect(config.getGlobalGuards()).toEqual([guard1, guard2]);
    });
  });

  describe("Global Request Pipes", () => {
    it("should start with empty global request pipes array", () => {
      expect(config.getGlobalRequestPipes()).toEqual([]);
    });

    it("should add a single global request pipe wrapper", () => {
      const wrapper = new InstanceWrapper({ transform: (value: any) => value } as any);
      
      config.addGlobalRequestPipe(wrapper);
      
      expect(config.getGlobalRequestPipes()).toEqual([wrapper]);
    });

    it("should preserve existing pipe wrappers when adding new ones", () => {
      const wrapper1 = new InstanceWrapper({ transform: (value: any) => value } as any);
      const wrapper2 = new InstanceWrapper({ transform: (value: any) => value.toString() } as any);
      
      config.addGlobalRequestPipe(wrapper1);
      config.addGlobalRequestPipe(wrapper2);
      
      expect(config.getGlobalRequestPipes()).toEqual([wrapper1, wrapper2]);
    });
  });

  describe("Global Request Filters", () => {
    it("should start with empty global request filters array", () => {
      expect(config.getGlobalRequestFilters()).toEqual([]);
    });

    it("should add a single global request filter wrapper", () => {
      const wrapper = new InstanceWrapper({ catch: () => {} } as any);
      
      config.addGlobalRequestFilter(wrapper);
      
      expect(config.getGlobalRequestFilters()).toEqual([wrapper]);
    });

    it("should preserve existing filter wrappers when adding new ones", () => {
      const wrapper1 = new InstanceWrapper({ catch: () => {} } as any);
      const wrapper2 = new InstanceWrapper({ catch: () => {} } as any);
      
      config.addGlobalRequestFilter(wrapper1);
      config.addGlobalRequestFilter(wrapper2);
      
      expect(config.getGlobalRequestFilters()).toEqual([wrapper1, wrapper2]);
    });
  });

  describe("Global Request Interceptors", () => {
    it("should start with empty global request interceptors array", () => {
      expect(config.getGlobalRequestInterceptors()).toEqual([]);
    });

    it("should add a single global request interceptor wrapper", () => {
      const wrapper = new InstanceWrapper({ intercept: () => {} } as any);
      
      config.addGlobalRequestInterceptor(wrapper);
      
      expect(config.getGlobalRequestInterceptors()).toEqual([wrapper]);
    });

    it("should preserve existing interceptor wrappers when adding new ones", () => {
      const wrapper1 = new InstanceWrapper({ intercept: () => {} } as any);
      const wrapper2 = new InstanceWrapper({ intercept: () => {} } as any);
      
      config.addGlobalRequestInterceptor(wrapper1);
      config.addGlobalRequestInterceptor(wrapper2);
      
      expect(config.getGlobalRequestInterceptors()).toEqual([wrapper1, wrapper2]);
    });
  });

  describe("Global Request Guards", () => {
    it("should start with empty global request guards array", () => {
      expect(config.getGlobalRequestGuards()).toEqual([]);
    });

    it("should add a single global request guard wrapper", () => {
      const wrapper = new InstanceWrapper({ canActivate: () => true } as any);
      
      config.addGlobalRequestGuard(wrapper);
      
      expect(config.getGlobalRequestGuards()).toEqual([wrapper]);
    });

    it("should preserve existing guard wrappers when adding new ones", () => {
      const wrapper1 = new InstanceWrapper({ canActivate: () => true } as any);
      const wrapper2 = new InstanceWrapper({ canActivate: () => false } as any);
      
      config.addGlobalRequestGuard(wrapper1);
      config.addGlobalRequestGuard(wrapper2);
      
      expect(config.getGlobalRequestGuards()).toEqual([wrapper1, wrapper2]);
    });
  });

  describe("Integration", () => {
    it("should maintain separate arrays for different types of global components", () => {
      const pipe = { transform: (value: any) => value };
      const filter = { catch: () => {} };
      const interceptor: VenokInterceptor = { intercept: () => {} } as any;
      const guard = { canActivate: () => true };
      
      config.addGlobalPipe(pipe);
      config.addGlobalFilter(filter);
      config.addGlobalInterceptor(interceptor);
      config.addGlobalGuard(guard);
      
      expect(config.getGlobalPipes()).toEqual([pipe]);
      expect(config.getGlobalFilters()).toEqual([filter]);
      expect(config.getGlobalInterceptors()).toEqual([interceptor]);
      expect(config.getGlobalGuards()).toEqual([guard]);
    });

    it("should maintain separate arrays for global and global request components", () => {
      const pipe = { transform: (value: any) => value };
      const pipeWrapper = new InstanceWrapper(pipe as any);
      
      config.addGlobalPipe(pipe);
      config.addGlobalRequestPipe(pipeWrapper);
      
      expect(config.getGlobalPipes()).toEqual([pipe]);
      expect(config.getGlobalRequestPipes()).toEqual([pipeWrapper]);
      expect(config.getGlobalPipes()).not.toBe(config.getGlobalRequestPipes());
    });
  });
});