import { AsyncLocalStorage } from "async_hooks";
import { expect } from "chai";
import { Observable, lastValueFrom, of, retry, merge, defer } from "rxjs";
import sinon, { SinonStub } from "sinon";
import { InterceptorsConsumer } from "@venok/core/interceptors";
import { CallHandler, VenokInterceptor } from "@venok/core/interfaces/features/interceptor.interface";
import { ExecutionContext } from "@venok/core/interfaces/context/execution.interface";

describe("InterceptorsConsumer", () => {
  let consumer: InterceptorsConsumer;
  let interceptors: any[];
  beforeEach(() => {
    consumer = new InterceptorsConsumer();
    interceptors = [
      {
        intercept: sinon.stub().callsFake((ctx, handler) => handler.handle()),
      },
      {
        intercept: sinon.stub().callsFake(async (ctx, handler) => handler.handle()),
      },
    ];
  });
  describe("intercept", () => {
    describe("when interceptors array is empty", () => {
      let next: sinon.SinonSpy;
      beforeEach(() => {
        next = sinon.spy();
      });
      it("should call next()", async () => {
        await consumer.intercept([], null as any, { constructor: null }, null as any, next);
        expect(next.calledOnce).to.be.true;
      });
    });
    describe("when interceptors array is not empty", () => {
      let next: sinon.SinonSpy;
      beforeEach(() => {
        next = sinon.stub().returns(Promise.resolve(""));
      });
      it("does not call `intercept` (lazy evaluation)", async () => {
        await consumer.intercept(interceptors, null as any, { constructor: null }, null as any, next);

        expect(interceptors[0].intercept.called).to.be.false;
        expect(interceptors[1].intercept.called).to.be.false;
      });
      it("should call every `intercept` method when subscribe", async () => {
        const intercepted = await consumer.intercept(
          interceptors,
          null as any,
          { constructor: null },
          null as any,
          next,
        );
        await transformToResult(intercepted);

        expect(interceptors[0].intercept.calledOnce).to.be.true;
        expect(interceptors[1].intercept.calledOnce).to.be.true;
      });
      it("should not call `next` (lazy evaluation)", async () => {
        await consumer.intercept(interceptors, null as any, { constructor: null }, null as any, next);
        expect(next.called).to.be.false;
      });
      it("should call `next` when subscribe", async () => {
        const intercepted = await consumer.intercept(
          interceptors,
          null as any,
          { constructor: null },
          null as any,
          next,
        );
        await transformToResult(intercepted);
        expect(next.called).to.be.true;
      });
    });

    describe("when AsyncLocalStorage is used", () => {
      it("should allow an interceptor to set values in AsyncLocalStorage that are accesible from the controller", async () => {
        const storage = new AsyncLocalStorage<Record<string, any>>();

        class StorageInterceptor implements VenokInterceptor {
          intercept(_context: ExecutionContext, next: CallHandler<any>): Observable<any> | Promise<Observable<any>> {
            return storage.run({ value: "hello" }, () => next.handle());
          }
        }

        const next = () => {
          return Promise.resolve(storage.getStore()!.value);
        };
        const intercepted = await consumer.intercept(
          [new StorageInterceptor()],
          null as any,
          { constructor: null },
          null as any,
          next,
        );
        const result = await transformToResult(intercepted);
        expect(result).to.equal("hello");
      });
    });

    describe("when retrying is enabled", () => {
      it("should retry a specified amount of times", async () => {
        let count = 0;
        const next = () => {
          count++;
          if (count < 3) {
            return Promise.reject(new Error("count not reached"));
          }
          return Promise.resolve(count);
        };

        class RetryInterceptor implements VenokInterceptor {
          intercept(_context: ExecutionContext, next: CallHandler<any>): Observable<any> | Promise<Observable<any>> {
            return next.handle().pipe(retry(4));
          }
        }

        const intercepted = await consumer.intercept(
          [new RetryInterceptor()],
          null as any,
          { constructor: null },
          null as any,
          next,
        );
        expect(await transformToResult(intercepted)).to.equal(3);
      });
    });
  });
  describe("createContext", () => {
    it("should return execution context object", () => {
      const instance = { constructor: {} };
      const callback = () => null;
      const context = consumer.createContext([], instance, callback);

      expect(context.getClass()).to.be.eql(instance.constructor);
      expect(context.getHandler()).to.be.eql(callback);
    });
  });
  describe("transformDeferred", () => {
    describe("when next() result is plain value", () => {
      it("should return Observable", async () => {
        const val = 3;
        const next = async () => val;
        expect(await lastValueFrom(consumer.transformDeferred(next))).to.be.eql(val);
      });
    });
    describe("when next() result is Promise", () => {
      it("should return Observable", async () => {
        const val = 3;
        const next = async () => val;
        expect(await lastValueFrom(consumer.transformDeferred(next))).to.be.eql(val);
      });
    });
    describe("when next() result is Observable", () => {
      it("should return Observable", async () => {
        const val = 3;
        const next = async () => of(val);
        expect(await lastValueFrom(consumer.transformDeferred(next) as any)).to.be.eql(val);
      });
    });
  });
  describe("deferred promise conversion", () => {
    it("should convert promise to observable deferred", async () => {
      class TestError extends Error {}

      const testInterceptors = [
        {
          intercept: sinon.stub().callsFake(async (ctx, handler) => {
            return merge(
              handler.handle(),
              defer(() => {
                throw new TestError();
              }),
            );
          }),
        },
        {
          intercept: sinon.stub().callsFake(async (ctx, handler) => handler.handle()),
        },
        {
          intercept: sinon.stub().callsFake(async (ctx, handler) => handler.handle()),
        },
      ] as VenokInterceptor[];

      const observable = await consumer.intercept(
        testInterceptors,
        null as unknown as unknown[],
        { constructor: null },
        () => {},
        async () => 1,
      );

      try {
        await transformToResult(observable);
      } catch (error) {
        if (!(error instanceof TestError)) {
          throw error;
        }
      }
      expect((testInterceptors[2].intercept as SinonStub).called).to.be.false;
    });
  });
});

async function transformToResult(resultOrDeferred: any) {
  if (resultOrDeferred && typeof resultOrDeferred.subscribe === "function") {
    return lastValueFrom(resultOrDeferred);
  }
  return resultOrDeferred;
}
