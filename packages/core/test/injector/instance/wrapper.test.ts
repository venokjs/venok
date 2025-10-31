import { beforeEach, describe, expect, it, spyOn, mock } from "bun:test";
import { Scope } from "~/enums/scope.enum.js";
import { STATIC_CONTEXT } from "~/injector/constants.js";
import { InstanceWrapper } from "~/injector/instance/wrapper.js";
import { createContextId } from "~/helpers/context-id-factory.helper.js";

class TestClass {}

describe("InstanceWrapper", () => {
  describe("initialize", () => {
    const partial = {
      name: "test",
      metatype: TestClass,
      scope: Scope.DEFAULT,
      instance: new TestClass(),
    };
    it("should assign partial", () => {
      const instance = new InstanceWrapper(partial);

      expect(instance.name).toEqual(partial.name);
      expect(instance.scope).toEqual(partial.scope);
      expect(instance.metatype).toEqual(partial.metatype);
    });
    it("should set instance by context id", () => {
      const instance = new InstanceWrapper(partial);

      expect(
        instance.getInstanceByContextId(STATIC_CONTEXT).instance
      ).toEqual(partial.instance);
    });
  });

  describe("isDependencyTreeStatic", () => {
    describe("when circular reference", () => {
      it("should return true", () => {
        const wrapper = new InstanceWrapper();
        const otherWrapper = new InstanceWrapper();
        wrapper.addCtorMetadata(0, otherWrapper);
        otherWrapper.addCtorMetadata(0, wrapper);
        expect(wrapper.isDependencyTreeStatic()).toBe(true);
        expect(otherWrapper.isDependencyTreeStatic()).toBe(true);
      });
    });
    describe("when circular reference and one non static", () => {
      it("should return false", () => {
        const wrapper = new InstanceWrapper();
        const otherWrapper = new InstanceWrapper({ scope: Scope.REQUEST });
        wrapper.addCtorMetadata(0, otherWrapper);
        otherWrapper.addCtorMetadata(0, wrapper);
        expect(wrapper.isDependencyTreeStatic()).toBe(false);
        expect(otherWrapper.isDependencyTreeStatic()).toBe(false);
      });
    });
    describe("when circular reference and one durable", () => {
      it("should return false", () => {
        const wrapper = new InstanceWrapper();
        const otherWrapper = new InstanceWrapper({
          scope: Scope.REQUEST,
          durable: true,
        });
        wrapper.addCtorMetadata(0, otherWrapper);
        otherWrapper.addCtorMetadata(0, wrapper);
        expect(wrapper.isDependencyTreeStatic()).toBe(false);
        expect(otherWrapper.isDependencyTreeStatic()).toBe(false);
      });
    });
    describe("when request scoped", () => {
      it("should return false", () => {
        const wrapper = new InstanceWrapper({
          scope: Scope.REQUEST,
        });
        expect(wrapper.isDependencyTreeStatic()).toBe(false);
      });
    });
    describe("when request scoped durable", () => {
      it("should return false", () => {
        const wrapper = new InstanceWrapper({
          scope: Scope.REQUEST,
          durable: true,
        });
        expect(wrapper.isDependencyTreeStatic()).toBe(false);
      });
    });
    describe("when request scoped explicit non durable", () => {
      it("should return false", () => {
        const wrapper = new InstanceWrapper({
          scope: Scope.REQUEST,
          durable: false,
        });
        expect(wrapper.isDependencyTreeStatic()).toBe(false);
      });
    });
    describe("when default", () => {
      it("should return true", () => {
        const wrapper = new InstanceWrapper({});
        expect(wrapper.isDependencyTreeStatic()).toBe(true);
      });
    });
    describe("when statically scoped", () => {
      describe("dependencies, properties, enhancers", () => {
        describe("dependencies non static, properties static, enhancers static", () => {
          it("should return false", () => {
            const wrapper = new InstanceWrapper();
            wrapper.addCtorMetadata(
              0,
              new InstanceWrapper({ scope: Scope.REQUEST })
            );
            wrapper.addPropertiesMetadata("key1", new InstanceWrapper());
            wrapper.addEnhancerMetadata(new InstanceWrapper());
            expect(wrapper.isDependencyTreeStatic()).toBe(false);
          });
        });
        describe("dependencies static, properties non static, enhancers static", () => {
          it("should return false", () => {
            const wrapper = new InstanceWrapper();
            wrapper.addCtorMetadata(0, new InstanceWrapper());
            wrapper.addPropertiesMetadata(
              "key1",
              new InstanceWrapper({ scope: Scope.REQUEST })
            );
            wrapper.addEnhancerMetadata(new InstanceWrapper());
            expect(wrapper.isDependencyTreeStatic()).toBe(false);
          });
        });
        describe("dependencies static, properties static, enhancers non static", () => {
          it("should return false", () => {
            const wrapper = new InstanceWrapper();
            wrapper.addCtorMetadata(0, new InstanceWrapper());
            wrapper.addPropertiesMetadata("key1", new InstanceWrapper());
            wrapper.addEnhancerMetadata(
              new InstanceWrapper({ scope: Scope.REQUEST })
            );
            expect(wrapper.isDependencyTreeStatic()).toBe(false);
          });
        });
      });
      describe("dependencies", () => {
        describe("when each is static", () => {
          it("should return true", () => {
            const wrapper = new InstanceWrapper();
            wrapper.addCtorMetadata(0, new InstanceWrapper());
            expect(wrapper.isDependencyTreeStatic()).toBe(true);
          });
        });
        describe("when one is not static", () => {
          it("should return false", () => {
            const wrapper = new InstanceWrapper();
            wrapper.addCtorMetadata(0, new InstanceWrapper());
            wrapper.addCtorMetadata(
              1,
              new InstanceWrapper({
                scope: Scope.REQUEST,
              })
            );
            expect(wrapper.isDependencyTreeStatic()).toBe(false);
          });
        });
      });
      describe("properties", () => {
        describe("when each is static", () => {
          it("should return true", () => {
            const wrapper = new InstanceWrapper();
            wrapper.addPropertiesMetadata("key1", new InstanceWrapper());
            wrapper.addPropertiesMetadata("key2", new InstanceWrapper());
            expect(wrapper.isDependencyTreeStatic()).toBe(true);
          });
        });
        describe("when one is not static", () => {
          it("should return false", () => {
            const wrapper = new InstanceWrapper();
            wrapper.addPropertiesMetadata(
              "key1",
              new InstanceWrapper({ scope: Scope.REQUEST })
            );
            wrapper.addPropertiesMetadata("key2", new InstanceWrapper());
            expect(wrapper.isDependencyTreeStatic()).toBe(false);
          });
        });
      });
      describe("enhancers", () => {
        describe("when each is static", () => {
          it("should return true", () => {
            const wrapper = new InstanceWrapper();
            wrapper.addEnhancerMetadata(new InstanceWrapper());
            wrapper.addEnhancerMetadata(new InstanceWrapper());
            expect(wrapper.isDependencyTreeStatic()).toBe(true);
          });
        });
        describe("when one is not static", () => {
          it("should return false", () => {
            const wrapper = new InstanceWrapper();
            wrapper.addEnhancerMetadata(
              new InstanceWrapper({ scope: Scope.REQUEST })
            );
            wrapper.addEnhancerMetadata(new InstanceWrapper());
            expect(wrapper.isDependencyTreeStatic()).toBe(false);
          });
        });
      });
    });
  });

  describe("isDependencyTreeDurable", () => {
    describe("when circular reference and default scope", () => {
      it("should return false", () => {
        const wrapper = new InstanceWrapper();
        const otherWrapper = new InstanceWrapper();
        wrapper.addCtorMetadata(0, otherWrapper);
        otherWrapper.addCtorMetadata(0, wrapper);
        expect(wrapper.isDependencyTreeDurable()).toBe(false);
        expect(otherWrapper.isDependencyTreeDurable()).toBe(false);
      });
    });
    describe("when circular reference and one non durable", () => {
      it("should return false", () => {
        const wrapper = new InstanceWrapper();
        const otherWrapper = new InstanceWrapper({ scope: Scope.REQUEST });
        wrapper.addCtorMetadata(0, otherWrapper);
        otherWrapper.addCtorMetadata(0, wrapper);
        expect(wrapper.isDependencyTreeDurable()).toBe(false);
        expect(otherWrapper.isDependencyTreeDurable()).toBe(false);
      });
    });
    describe("when circular reference and one durable", () => {
      it("should return true", () => {
        const wrapper = new InstanceWrapper();
        const otherWrapper = new InstanceWrapper({
          scope: Scope.REQUEST,
          durable: true,
        });
        wrapper.addCtorMetadata(0, otherWrapper);
        otherWrapper.addCtorMetadata(0, wrapper);
        expect(wrapper.isDependencyTreeDurable()).toBe(true);
        expect(otherWrapper.isDependencyTreeDurable()).toBe(true);
      });
    });
    describe("when request scoped and durable", () => {
      it("should return true", () => {
        const wrapper = new InstanceWrapper({
          scope: Scope.REQUEST,
          durable: true,
        });
        expect(wrapper.isDependencyTreeDurable()).toBe(true);
      });
    });
    describe("when request scoped and non durable", () => {
      it("should return false", () => {
        const wrapper = new InstanceWrapper({
          scope: Scope.REQUEST,
        });
        expect(wrapper.isDependencyTreeDurable()).toBe(false);
      });
    });
    describe("when request scoped and explicit non durable", () => {
      it("should return false", () => {
        const wrapper = new InstanceWrapper({
          scope: Scope.REQUEST,
          durable: false,
        });
        expect(wrapper.isDependencyTreeDurable()).toBe(false);
      });
    });
    describe("when default scope", () => {
      it("should return false", () => {
        const wrapper = new InstanceWrapper();
        expect(wrapper.isDependencyTreeDurable()).toBe(false);
      });
    });
    describe("when statically scoped", () => {
      describe("dependencies, properties, enhancers", () => {
        describe("dependencies non durable, properties non durable, enhancers durable", () => {
          it("should return false", () => {
            const wrapper = new InstanceWrapper();
            wrapper.addCtorMetadata(
              0,
              new InstanceWrapper({ scope: Scope.REQUEST })
            );
            wrapper.addCtorMetadata(1, new InstanceWrapper());
            wrapper.addPropertiesMetadata("key1", new InstanceWrapper());
            wrapper.addEnhancerMetadata(new InstanceWrapper());
            expect(wrapper.isDependencyTreeDurable()).toBe(false);
          });
        });
        describe("dependencies non durable, properties durable, enhancers durable", () => {
          it("should return false", () => {
            const wrapper = new InstanceWrapper();
            wrapper.addCtorMetadata(
              0,
              new InstanceWrapper({ scope: Scope.REQUEST })
            );
            wrapper.addCtorMetadata(1, new InstanceWrapper());
            wrapper.addPropertiesMetadata(
              "key1",
              new InstanceWrapper({ scope: Scope.REQUEST })
            );
            wrapper.addEnhancerMetadata(new InstanceWrapper());
            expect(wrapper.isDependencyTreeDurable()).toBe(false);
          });
        });
        describe("dependencies non durable, properties durable", () => {
          it("should return false", () => {
            const wrapper = new InstanceWrapper();
            wrapper.addCtorMetadata(
              0,
              new InstanceWrapper({ scope: Scope.REQUEST })
            );
            wrapper.addCtorMetadata(1, new InstanceWrapper());
            wrapper.addPropertiesMetadata("key1", new InstanceWrapper());
            wrapper.addPropertiesMetadata(
              "key2",
              new InstanceWrapper({ scope: Scope.REQUEST, durable: true })
            );
            expect(wrapper.isDependencyTreeDurable()).toBe(false);
          });
        });
        describe("properties durable, enhancers non durable", () => {
          it("should return false", () => {
            const wrapper = new InstanceWrapper();
            wrapper.addPropertiesMetadata("key1", new InstanceWrapper());
            wrapper.addPropertiesMetadata(
              "key2",
              new InstanceWrapper({ scope: Scope.REQUEST, durable: true })
            );
            wrapper.addEnhancerMetadata(
              new InstanceWrapper({ scope: Scope.REQUEST })
            );
            expect(wrapper.isDependencyTreeDurable()).toBe(false);
          });
        });
        describe("dependencies durable, enhancers non durable", () => {
          it("should return false", () => {
            const wrapper = new InstanceWrapper();
            wrapper.addCtorMetadata(
              0,
              new InstanceWrapper({ scope: Scope.REQUEST, durable: true })
            );
            wrapper.addEnhancerMetadata(
              new InstanceWrapper({ scope: Scope.REQUEST })
            );
            expect(wrapper.isDependencyTreeDurable()).toBe(false);
          });
        });
      });
      describe("dependencies", () => {
        describe("when wrapper is non durable and dependency is static", () => {
          it("should return false", () => {
            const wrapper = new InstanceWrapper({ scope: Scope.REQUEST });
            wrapper.addCtorMetadata(0, new InstanceWrapper());
            expect(wrapper.isDependencyTreeDurable()).toBe(false);
          });
        });
        describe("when wrapper is durable and dependency is static", () => {
          it("should return true", () => {
            const wrapper = new InstanceWrapper({
              scope: Scope.REQUEST,
              durable: true,
            });
            wrapper.addCtorMetadata(0, new InstanceWrapper());
            expect(wrapper.isDependencyTreeDurable()).toBe(true);
          });
        });
        describe("when wrapper is non durable and dependency is durable", () => {
          it("should return false", () => {
            const wrapper = new InstanceWrapper({
              scope: Scope.REQUEST,
            });
            wrapper.addCtorMetadata(
              0,
              new InstanceWrapper({ scope: Scope.REQUEST, durable: true })
            );
            expect(wrapper.isDependencyTreeDurable()).toBe(false);
          });
        });
        describe("when wrapper is durable and dependency is static", () => {
          it("should return true", () => {
            const wrapper = new InstanceWrapper({
              scope: Scope.REQUEST,
              durable: true,
            });
            wrapper.addCtorMetadata(0, new InstanceWrapper());
            expect(wrapper.isDependencyTreeDurable()).toBe(true);
          });
        });
        describe("when wrapper is durable and dependency is non durable", () => {
          it("should return true", () => {
            const wrapper = new InstanceWrapper({
              scope: Scope.REQUEST,
              durable: true,
            });
            wrapper.addCtorMetadata(
              0,
              new InstanceWrapper({ scope: Scope.REQUEST })
            );
            expect(wrapper.isDependencyTreeDurable()).toBe(true);
          });
        });
        describe("when each is static", () => {
          it("should return false", () => {
            const wrapper = new InstanceWrapper();
            wrapper.addCtorMetadata(0, new InstanceWrapper());
            expect(wrapper.isDependencyTreeDurable()).toBe(false);
          });
        });
        describe("when one is not static and non-durable", () => {
          it("should return false", () => {
            const wrapper = new InstanceWrapper();
            wrapper.addCtorMetadata(0, new InstanceWrapper());
            wrapper.addCtorMetadata(
              1,
              new InstanceWrapper({
                scope: Scope.REQUEST,
              })
            );
            expect(wrapper.isDependencyTreeDurable()).toBe(false);
          });
        });
        describe("when one is not static and durable", () => {
          it("should return true", () => {
            const wrapper = new InstanceWrapper();
            wrapper.addCtorMetadata(0, new InstanceWrapper());
            wrapper.addCtorMetadata(
              1,
              new InstanceWrapper({
                scope: Scope.REQUEST,
                durable: true,
              })
            );
            expect(wrapper.isDependencyTreeDurable()).toBe(true);
          });
        });
        describe("when one is not static, durable and non durable", () => {
          it("should return false", () => {
            const wrapper = new InstanceWrapper();
            wrapper.addCtorMetadata(0, new InstanceWrapper());
            wrapper.addCtorMetadata(
              1,
              new InstanceWrapper({
                scope: Scope.REQUEST,
                durable: true,
              })
            );
            wrapper.addCtorMetadata(
              2,
              new InstanceWrapper({
                scope: Scope.REQUEST,
              })
            );
            expect(wrapper.isDependencyTreeDurable()).toBe(false);
          });
        });
      });
      describe("properties", () => {
        describe("when wrapper is non durable and dependency is static", () => {
          it("should return false", () => {
            const wrapper = new InstanceWrapper({ scope: Scope.REQUEST });
            wrapper.addPropertiesMetadata("key1", new InstanceWrapper());
            expect(wrapper.isDependencyTreeDurable()).toBe(false);
          });
        });
        describe("when wrapper is durable and dependency is static", () => {
          it("should return true", () => {
            const wrapper = new InstanceWrapper({
              scope: Scope.REQUEST,
              durable: true,
            });
            wrapper.addPropertiesMetadata("key1", new InstanceWrapper());
            expect(wrapper.isDependencyTreeDurable()).toBe(true);
          });
        });
        describe("when wrapper is non durable and dependency is durable", () => {
          it("should return false", () => {
            const wrapper = new InstanceWrapper({
              scope: Scope.REQUEST,
            });
            wrapper.addPropertiesMetadata(
              "key1",
              new InstanceWrapper({ scope: Scope.REQUEST, durable: true })
            );
            expect(wrapper.isDependencyTreeDurable()).toBe(false);
          });
        });
        describe("when wrapper is durable and dependency is static", () => {
          it("should return true", () => {
            const wrapper = new InstanceWrapper({
              scope: Scope.REQUEST,
              durable: true,
            });
            wrapper.addPropertiesMetadata("key1", new InstanceWrapper());
            expect(wrapper.isDependencyTreeDurable()).toBe(true);
          });
        });
        describe("when wrapper is durable and dependency is non durable", () => {
          it("should return true", () => {
            const wrapper = new InstanceWrapper({
              scope: Scope.REQUEST,
              durable: true,
            });
            wrapper.addPropertiesMetadata(
              "key1",
              new InstanceWrapper({ scope: Scope.REQUEST })
            );
            expect(wrapper.isDependencyTreeDurable()).toBe(true);
          });
        });
        describe("when each is static", () => {
          it("should return false", () => {
            const wrapper = new InstanceWrapper();
            wrapper.addPropertiesMetadata("key1", new InstanceWrapper());
            wrapper.addPropertiesMetadata("key2", new InstanceWrapper());
            expect(wrapper.isDependencyTreeDurable()).toBe(false);
          });
        });
        describe("when one is not static and non-durable", () => {
          it("should return false", () => {
            const wrapper = new InstanceWrapper();
            wrapper.addPropertiesMetadata(
              "key1",
              new InstanceWrapper({ scope: Scope.REQUEST })
            );
            wrapper.addPropertiesMetadata("key2", new InstanceWrapper());
            expect(wrapper.isDependencyTreeDurable()).toBe(false);
          });
        });
        describe("when one is not static and durable", () => {
          it("should return true", () => {
            const wrapper = new InstanceWrapper();
            wrapper.addPropertiesMetadata(
              "key1",
              new InstanceWrapper({ scope: Scope.REQUEST, durable: true })
            );
            wrapper.addPropertiesMetadata("key2", new InstanceWrapper());
            expect(wrapper.isDependencyTreeDurable()).toBe(true);
          });
        });
        describe("when one is not static, non durable and durable", () => {
          it("should return false", () => {
            const wrapper = new InstanceWrapper();
            wrapper.addPropertiesMetadata(
              "key1",
              new InstanceWrapper({ scope: Scope.REQUEST, durable: true })
            );
            wrapper.addPropertiesMetadata("key2", new InstanceWrapper());
            wrapper.addPropertiesMetadata(
              "key3",
              new InstanceWrapper({ scope: Scope.REQUEST })
            );
            expect(wrapper.isDependencyTreeDurable()).toBe(false);
          });
        });
      });
      describe("enhancers", () => {
        describe("when wrapper is non durable and dependency is static", () => {
          it("should return false", () => {
            const wrapper = new InstanceWrapper({ scope: Scope.REQUEST });
            wrapper.addEnhancerMetadata(new InstanceWrapper());
            expect(wrapper.isDependencyTreeDurable()).toBe(false);
          });
        });
        describe("when wrapper is durable and dependency is static", () => {
          it("should return true", () => {
            const wrapper = new InstanceWrapper({
              scope: Scope.REQUEST,
              durable: true,
            });
            wrapper.addEnhancerMetadata(new InstanceWrapper());
            expect(wrapper.isDependencyTreeDurable()).toBe(true);
          });
        });
        describe("when wrapper is non durable and dependency is durable", () => {
          it("should return false", () => {
            const wrapper = new InstanceWrapper({
              scope: Scope.REQUEST,
            });
            wrapper.addEnhancerMetadata(
              new InstanceWrapper({ scope: Scope.REQUEST, durable: true })
            );
            expect(wrapper.isDependencyTreeDurable()).toBe(false);
          });
        });
        describe("when wrapper is durable and dependency is static", () => {
          it("should return true", () => {
            const wrapper = new InstanceWrapper({
              scope: Scope.REQUEST,
              durable: true,
            });
            wrapper.addEnhancerMetadata(new InstanceWrapper());
            expect(wrapper.isDependencyTreeDurable()).toBe(true);
          });
        });
        describe("when wrapper is durable and dependency is non durable", () => {
          it("should return true", () => {
            const wrapper = new InstanceWrapper({
              scope: Scope.REQUEST,
              durable: true,
            });
            wrapper.addEnhancerMetadata(
              new InstanceWrapper({ scope: Scope.REQUEST })
            );
            expect(wrapper.isDependencyTreeDurable()).toBe(true);
          });
        });
        describe("when each is static", () => {
          it("should return false", () => {
            const wrapper = new InstanceWrapper();
            wrapper.addEnhancerMetadata(new InstanceWrapper());
            wrapper.addEnhancerMetadata(new InstanceWrapper());
            expect(wrapper.isDependencyTreeDurable()).toBe(false);
          });
        });
        describe("when one is not static and non-durable", () => {
          it("should return false", () => {
            const wrapper = new InstanceWrapper();
            wrapper.addEnhancerMetadata(
              new InstanceWrapper({ scope: Scope.REQUEST })
            );
            wrapper.addEnhancerMetadata(new InstanceWrapper());
            expect(wrapper.isDependencyTreeDurable()).toBe(false);
          });
        });
        describe("when one is not static and durable", () => {
          it("should return true", () => {
            const wrapper = new InstanceWrapper();
            wrapper.addEnhancerMetadata(
              new InstanceWrapper({ scope: Scope.REQUEST, durable: true })
            );
            wrapper.addEnhancerMetadata(new InstanceWrapper());
            expect(wrapper.isDependencyTreeDurable()).toBe(true);
          });
        });
        describe("when one is not static, non durable and durable", () => {
          it("should return false", () => {
            const wrapper = new InstanceWrapper();
            wrapper.addEnhancerMetadata(
              new InstanceWrapper({ scope: Scope.REQUEST, durable: true })
            );
            wrapper.addEnhancerMetadata(new InstanceWrapper());
            wrapper.addEnhancerMetadata(
              new InstanceWrapper({ scope: Scope.REQUEST })
            );
            expect(wrapper.isDependencyTreeDurable()).toBe(false);
          });
        });
      });
    });
  });

  describe("isNotMetatype", () => {
    describe("when metatype is nil", () => {
      it("should return true", () => {
        const instance = new InstanceWrapper({ metatype: null });
        expect(instance.isNotMetatype).toBe(true);
      });
    });
    describe("when metatype is not nil", () => {
      it("should return false", () => {
        const instance = new InstanceWrapper({ metatype: TestClass });
        expect(instance.isNotMetatype).toBe(false);
      });
    });
  });

  describe("addEnhancerMetadata", () => {
    it("should add enhancers metadata", () => {
      const instance = new InstanceWrapper();
      const enhancers = [new InstanceWrapper()];
      instance.addEnhancerMetadata(enhancers[0]);
      expect(instance.getEnhancersMetadata()).toEqual(enhancers);
    });
  });

  describe("when set instance has been called", () => {
    it("should set static context value", () => {
      const instance = { test: true };
      const wrapper = new InstanceWrapper();
      wrapper.instance = instance;

      expect(wrapper.getInstanceByContextId(STATIC_CONTEXT).instance).toEqual(
        instance
      );
    });
  });

  describe("cloneStaticInstance", () => {
    describe("when wrapper is static", () => {
      it("should return static instance", () => {
        const instance = { test: true };
        const wrapper = new InstanceWrapper({ instance });

        expect(wrapper.cloneStaticInstance({ id: 0 }).instance).toEqual(
          instance
        );
      });
    });
    describe("when wrapper is not static", () => {
      it("should clone instance by context id", () => {
        const instance = { test: true };
        const wrapper = new InstanceWrapper({ instance, scope: Scope.REQUEST });

        expect(wrapper.cloneStaticInstance({ id: 0 }).instance).toBeUndefined();
      });
    });
  });

  describe("getInstanceByContextId", () => {
    describe("when transient and inquirer has been passed", () => {
      it('should call "getInstanceByInquirerId"', () => {
        const wrapper = new InstanceWrapper({
          scope: Scope.TRANSIENT,
        });
        const getInstanceByInquirerIdSpy = spyOn(
          wrapper,
          "getInstanceByInquirerId"
        );
        wrapper.getInstanceByContextId(STATIC_CONTEXT, "inquirerId");
        expect(getInstanceByInquirerIdSpy).toHaveBeenCalled();
      });
    });
  });

  describe("setInstanceByContextId", () => {
    describe("when transient and inquirer has been passed", () => {
      it('should call "setInstanceByInquirerId"', () => {
        const wrapper = new InstanceWrapper({
          scope: Scope.TRANSIENT,
        });
        const setInstanceByInquirerIdSpy = spyOn(
          wrapper,
          "setInstanceByInquirerId"
        );
        wrapper.setInstanceByContextId(
          STATIC_CONTEXT,
          { instance: {} },
          "inquirerId"
        );
        expect(setInstanceByInquirerIdSpy).toHaveBeenCalled();
      });
    });
  });

  describe("removeInstanceByContextId", () => {
    describe("without inquirer", () => {
      it("should remove instance for given context", () => {
        const wrapper = new InstanceWrapper({
          scope: Scope.TRANSIENT,
        });

        const contextId = createContextId();
        wrapper.setInstanceByContextId(contextId, { instance: {} });

        const existingContext = wrapper.getInstanceByContextId(contextId);
        expect(existingContext.instance).not.toBeUndefined();
        wrapper.removeInstanceByContextId(contextId);

        const removedContext = wrapper.getInstanceByContextId(contextId);
        expect(removedContext.instance).toBeUndefined();
      });
    });

    describe("when transient and inquirer has been passed", () => {
      it("should remove instance for given context", () => {
        const wrapper = new InstanceWrapper({
          scope: Scope.TRANSIENT,
        });

        wrapper.setInstanceByContextId(
          STATIC_CONTEXT,
          { instance: {} },
          "inquirerId"
        );

        const existingContext = wrapper.getInstanceByContextId(
          STATIC_CONTEXT,
          "inquirerId"
        );
        expect(existingContext.instance).not.toBeUndefined();
        wrapper.removeInstanceByContextId(STATIC_CONTEXT, "inquirerId");

        const removedContext = wrapper.getInstanceByContextId(
          STATIC_CONTEXT,
          "inquirerId"
        );
        expect(removedContext.instance).toBeUndefined();
      });
    });
  });

  describe("isInRequestScope", () => {
    describe("when tree and context are not static and is not transient", () => {
      it("should return true", () => {
        const wrapper = new InstanceWrapper({
          scope: Scope.REQUEST,
        });
        expect(wrapper.isInRequestScope({ id: 3 })).toBe(true);
      });
    });
    describe("otherwise", () => {
      it("should return false", () => {
        const wrapper = new InstanceWrapper({
          scope: Scope.TRANSIENT,
        });
        expect(wrapper.isInRequestScope({ id: 3 })).toBe(false);

        const wrapper2 = new InstanceWrapper({
          scope: Scope.REQUEST,
        });
        expect(wrapper2.isInRequestScope(STATIC_CONTEXT)).toBe(false);
      });
    });
  });

  describe("isLazyTransient", () => {
    describe("when inquirer is request scoped and context is not static and is transient", () => {
      it("should return true", () => {
        const wrapper = new InstanceWrapper({
          scope: Scope.TRANSIENT,
        });
        expect(
          wrapper.isLazyTransient(
            { id: 3 },
            new InstanceWrapper({
              scope: Scope.REQUEST,
            })
          )
        ).toBe(true);
      });
    });
    describe("otherwise", () => {
      it("should return false", () => {
        const wrapper = new InstanceWrapper({
          scope: Scope.TRANSIENT,
        });
        expect(wrapper.isLazyTransient({ id: 3 }, new InstanceWrapper())).toBe(false);

        const wrapper2 = new InstanceWrapper({
          scope: Scope.REQUEST,
        });
        expect(
          wrapper2.isLazyTransient(
            STATIC_CONTEXT,
            new InstanceWrapper({
              scope: Scope.TRANSIENT,
            })
          )
        ).toBe(false);
      });
    });
  });

  describe("isStatic", () => {
    describe("when inquirer is not request scoped and context and tree are static", () => {
      it("should return true", () => {
        const wrapper = new InstanceWrapper({
          scope: Scope.DEFAULT,
        });
        expect(
          wrapper.isStatic(
            STATIC_CONTEXT,
            new InstanceWrapper({
              scope: Scope.DEFAULT,
            })
          )
        ).toBe(true);
      });
    });
    describe("otherwise", () => {
      it("should return false", () => {
        const wrapper = new InstanceWrapper({
          scope: Scope.REQUEST,
        });
        expect(wrapper.isStatic({ id: 3 }, new InstanceWrapper())).toBe(false);

        const wrapper2 = new InstanceWrapper({
          scope: Scope.TRANSIENT,
        });
        expect(
          wrapper2.isStatic(
            STATIC_CONTEXT,
            new InstanceWrapper({
              scope: Scope.REQUEST,
            })
          )
        ).toBe(false);
      });
    });
  });

  describe("getStaticTransientInstances", () => {
    describe("when instance is not transient", () => {
      it("should return an empty array", () => {
        const wrapper = new InstanceWrapper({
          scope: Scope.DEFAULT,
        });
        expect(wrapper.getStaticTransientInstances()).toEqual([]);
      });
    });
    describe("when instance is transient", () => {
      it("should return instances where constructor was called", () => {
        const wrapper = new InstanceWrapper({
          scope: Scope.TRANSIENT,
        });
        const instanceHost = {
          instance: {},
          isConstructorCalled: true,
        };
        wrapper.setInstanceByInquirerId(STATIC_CONTEXT, "test", instanceHost);
        expect(wrapper.getStaticTransientInstances()).toEqual([instanceHost]);
      });

      describe("lifecycle hooks on transient services", () => {
        // Tests for issue #15553: prevent lifecycle hooks on non-instantiated transient services
        it("should filter out instances created with Object.create (prototype only)", () => {
          const wrapper = new InstanceWrapper({
            scope: Scope.TRANSIENT,
          });
          // Simulates what happens in cloneTransientInstance
          const prototypeOnlyInstance = {
            instance: Object.create({}),
            isResolved: true, // This is set to true incorrectly in injector.ts
            isConstructorCalled: false, // But constructor was never called
          };
          wrapper.setInstanceByInquirerId(
            STATIC_CONTEXT,
            "inquirer",
            prototypeOnlyInstance
          );

          // Should not include this instance for lifecycle hooks
          expect(wrapper.getStaticTransientInstances()).toEqual([]);
        });

        it("should include instances where constructor was actually invoked", () => {
          class TestService {}
          const wrapper = new InstanceWrapper({
            scope: Scope.TRANSIENT,
            metatype: TestService,
          });
          // Simulates what happens after instantiateClass
          const properInstance = {
            instance: new TestService(),
            isResolved: true,
            isConstructorCalled: true,
          };
          wrapper.setInstanceByInquirerId(
            STATIC_CONTEXT,
            "inquirer",
            properInstance
          );

          // Should include this instance for lifecycle hooks
          expect(wrapper.getStaticTransientInstances()).toEqual([properInstance]);
        });
      });
    });
  });

  describe("mergeWith", () => {
    describe("when provider is a ValueProvider", () => {
      it("should provide the given value in the STATIC_CONTEXT", () => {
        const wrapper = new InstanceWrapper();
        wrapper.mergeWith({
          useValue: "value",
          provide: "token",
        });

        expect(
          wrapper.getInstanceByContextId(STATIC_CONTEXT).instance
        ).toBe("value");
      });
    });

    describe("when provider is a ClassProvider", () => {
      it("should alter the instance wrapper metatype with the given class", () => {
        const wrapper = new InstanceWrapper();

        wrapper.mergeWith({
          useClass: TestClass,
          provide: "token",
        });

        expect(wrapper.metatype).toEqual(TestClass);
      });
    });

    describe("when provider is a FactoryProvider", () => {
      describe("and it has injected dependencies", () => {
        it("should alter the instance wrapper metatype and inject attributes with the given values", () => {
          const wrapper = new InstanceWrapper();

          const factory = (_dependency1: any, _dependency2: any) => {};
          const injectedDependencies = ["dependency1", "dependency2"];

          wrapper.mergeWith({
            provide: "token",
            useFactory: factory,
            inject: injectedDependencies,
          });

          expect(wrapper.metatype).toEqual(factory);
          expect(wrapper.inject).toBe(injectedDependencies);
        });
      });

      describe("and it has no injected dependencies", () => {
        it("should alter the instance wrapper metatype with the given values", () => {
          const wrapper = new InstanceWrapper();
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const factory = (_dependency1: any, _dependency2: any) => {};

          wrapper.mergeWith({
            provide: "token",
            useFactory: factory,
          });

          expect(wrapper.metatype).toEqual(factory);
          expect(wrapper.inject).toEqual([]);
        });
      });
    });
  });
});