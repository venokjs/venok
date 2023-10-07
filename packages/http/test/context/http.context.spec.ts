import { expect } from "chai";
import { of } from "rxjs";
import sinon from "sinon";
import { PassThrough } from "stream";
import { HandlerResponseBasicFn, HttpExecutionContext } from "@venok/http/context/http.context";
import { PipesConsumer, PipesContextCreator } from "@venok/core/pipes";
import { GuardsConsumer, GuardsContextCreator } from "@venok/core/guards";
import { InterceptorsConsumer, InterceptorsContextCreator } from "@venok/core/interceptors";
import { AbstractHttpAdapter } from "@venok/http/adapter/adapter";
import { NoopHttpAdapter } from "@venok/http/helpers/adapter.helper";
import { ApplicationConfig, RouteParamMetadata, VenokContainer } from "@venok/core";
import { RouteParamtypes } from "../../enums";
import { CUSTOM_ROUTE_ARGS_METADATA } from "@venok/core/constants";
import { RuntimeException } from "@venok/core/errors/exceptions";
import { HeaderStream } from "@venok/http/helpers/sse.helper";
import { RouteParamsFactory } from "@venok/http/factory/params.factory";

describe("HttpExecutionContext", () => {
  let contextCreator: HttpExecutionContext;
  let callback: any;
  let applySpy: sinon.SinonSpy;
  let factory: RouteParamsFactory;
  let consumer: PipesConsumer;
  let guardsConsumer: GuardsConsumer;
  let interceptorsConsumer: InterceptorsConsumer;
  let adapter: AbstractHttpAdapter;

  beforeEach(() => {
    callback = {
      bind: () => ({}),
      apply: () => ({}),
    };
    applySpy = sinon.spy(callback, "apply");

    factory = new RouteParamsFactory();
    consumer = new PipesConsumer();
    guardsConsumer = new GuardsConsumer();
    interceptorsConsumer = new InterceptorsConsumer();
    adapter = new NoopHttpAdapter({});
    contextCreator = new HttpExecutionContext(
      factory,
      new PipesContextCreator(new VenokContainer(), new ApplicationConfig()),
      consumer,
      new GuardsContextCreator(new VenokContainer()),
      guardsConsumer,
      new InterceptorsContextCreator(new VenokContainer()),
      interceptorsConsumer,
      adapter,
    );
  });
  describe("create", () => {
    describe("when callback metadata is not undefined", () => {
      let metadata: Record<number, RouteParamMetadata>;
      let exchangeKeysForValuesSpy: sinon.SinonSpy;
      beforeEach(() => {
        metadata = {
          [RouteParamtypes.NEXT]: { index: 0 },
          [RouteParamtypes.BODY]: {
            index: 2,
            data: "test",
          },
        };
        sinon.stub((contextCreator as any).contextUtils, "reflectCallbackMetadata").returns(metadata);
        sinon.stub((contextCreator as any).contextUtils, "reflectCallbackParamtypes").returns([]);
        exchangeKeysForValuesSpy = sinon.spy(contextCreator, "exchangeKeysForValues");
      });
      it('should call "exchangeKeysForValues" with expected arguments', (done) => {
        const keys = Object.keys(metadata);

        contextCreator.create({ foo: "bar" }, callback as any, "", "", 0);
        expect(exchangeKeysForValuesSpy.called).to.be.true;
        expect(exchangeKeysForValuesSpy.calledWith(keys, metadata)).to.be.true;
        done();
      });
      describe("returns proxy function", () => {
        let proxyContext: any;
        let instance: any;
        let tryActivateStub: any;
        beforeEach(() => {
          instance = { foo: "bar" };

          const canActivateFn = contextCreator.createGuardsFn([1] as any, null as any, null as any);
          sinon.stub(contextCreator, "createGuardsFn").returns(canActivateFn);
          tryActivateStub = sinon.stub(guardsConsumer, "tryActivate").callsFake(async () => true);
          proxyContext = contextCreator.create(instance, callback as any, "", "", 0);
        });
        it("should be a function", () => {
          expect(proxyContext).to.be.a("function");
        });
        describe("when proxy function called", () => {
          let request: any;
          const response = {
            status: () => response,
            send: () => response,
            json: () => response,
          };
          const next = {};

          beforeEach(() => {
            request = {
              body: {
                test: 3,
              },
            };
          });
          it("should apply expected context and arguments to callback", (done) => {
            tryActivateStub.callsFake(async () => true);
            proxyContext(request, response, next).then(() => {
              const args = [next, undefined, request.body.test];
              expect(applySpy.called).to.be.true;
              expect(applySpy.calledWith(instance, args)).to.be.true;
              done();
            });
          });
          it('should throw exception when "tryActivate" returns false', async () => {
            tryActivateStub.callsFake(async () => false);

            // Maybe Error
            let error: RuntimeException = {} as any;
            try {
              await proxyContext(request, response, next);
            } catch (e) {
              error = e as any;
            }
            expect(error).to.be.instanceOf(RuntimeException);
            expect(error.message).to.be.eql("Forbidden resource");
          });
          it('should apply expected context when "canActivateFn" apply', () => {
            proxyContext(request, response, next).then(() => {
              expect(tryActivateStub.args[0][1][0]).to.equals(request);
              expect(tryActivateStub.args[0][1][1]).to.equals(response);
              expect(tryActivateStub.args[0][1][2]).to.equals(next);
            });
          });
          it('should apply expected context when "intercept" apply', () => {
            const interceptStub = sinon.stub(interceptorsConsumer, "intercept");
            proxyContext(request, response, next).then(() => {
              expect(interceptStub.args[0][1][0]).to.equals(request);
              expect(interceptStub.args[0][1][1]).to.equals(response);
              expect(interceptStub.args[0][1][2]).to.equals(next);
            });
          });
        });
      });
    });
  });

  describe("exchangeKeysForValues", () => {
    it("should exchange arguments keys for appropriate values", () => {
      const metadata = {
        [RouteParamtypes.REQUEST]: { index: 0, data: "test", pipes: [] },
        [RouteParamtypes.BODY]: { index: 2, data: "test", pipes: [] },
        [`key${CUSTOM_ROUTE_ARGS_METADATA}`]: {
          index: 3,
          data: "custom",
          pipes: [],
        },
      };
      const keys = Object.keys(metadata);
      const values = contextCreator.exchangeKeysForValues(keys, metadata, "");
      const expectedValues = [
        { index: 0, type: RouteParamtypes.REQUEST, data: "test" },
        { index: 2, type: RouteParamtypes.BODY, data: "test" },
        { index: 3, type: `key${CUSTOM_ROUTE_ARGS_METADATA}`, data: "custom" },
      ];
      expect(values[0]).to.deep.include(expectedValues[0]);
      expect(values[1]).to.deep.include(expectedValues[1]);
    });
  });

  describe("getParamValue", () => {
    let consumerApplySpy: sinon.SinonSpy;
    const value = 3,
      metatype = null,
      transforms = [{ transform: sinon.spy() }];

    beforeEach(() => {
      consumerApplySpy = sinon.spy(consumer, "apply");
    });
    describe("when paramtype is query, body or param", () => {
      it('should call "consumer.apply" with expected arguments', () => {
        contextCreator.getParamValue(value, { metatype, type: RouteParamtypes.QUERY, data: null }, transforms);
        expect(consumerApplySpy.calledWith(value, { metatype, type: RouteParamtypes.QUERY, data: null }, transforms)).to
          .be.true;

        contextCreator.getParamValue(value, { metatype, type: RouteParamtypes.BODY, data: null }, transforms);
        expect(consumerApplySpy.calledWith(value, { metatype, type: RouteParamtypes.BODY, data: null }, transforms)).to
          .be.true;

        contextCreator.getParamValue(value, { metatype, type: RouteParamtypes.PARAM, data: null }, transforms);
        expect(consumerApplySpy.calledWith(value, { metatype, type: RouteParamtypes.PARAM, data: null }, transforms)).to
          .be.true;
      });
    });
  });
  describe("isPipeable", () => {
    describe("when paramtype is not query, body, param and custom", () => {
      it("should return false", () => {
        const result = contextCreator.isPipeable(RouteParamtypes.NEXT);
        expect(result).to.be.false;
      });
      it("otherwise", () => {
        expect(contextCreator.isPipeable(RouteParamtypes.BODY)).to.be.true;
        expect(contextCreator.isPipeable(RouteParamtypes.QUERY)).to.be.true;
        expect(contextCreator.isPipeable(RouteParamtypes.PARAM)).to.be.true;
        expect(contextCreator.isPipeable(RouteParamtypes.FILE)).to.be.true;
        expect(contextCreator.isPipeable(RouteParamtypes.FILES)).to.be.true;
        expect(contextCreator.isPipeable("custom")).to.be.true;
      });
    });
  });
  describe("createPipesFn", () => {
    describe('when "paramsOptions" is empty', () => {
      it("returns null", async () => {
        const pipesFn = contextCreator.createPipesFn([], []);
        expect(pipesFn).to.be.null;
      });
    });
  });
  describe("createGuardsFn", () => {
    it('should throw ForbiddenException when "tryActivate" returns false', async () => {
      const guardsFn = contextCreator.createGuardsFn([null as any], null as any, null as any);
      sinon.stub(guardsConsumer, "tryActivate").callsFake(async () => false);

      // Maybe Error
      let error: RuntimeException = {} as any;
      try {
        await guardsFn([]);
      } catch (e) {
        console.log(e);
        error = e as any;
      }

      expect(error).to.be.instanceOf(RuntimeException);
      expect(error.message).to.be.eql("Forbidden resource");
    });
  });
  describe("createHandleResponseFn", () => {
    describe('when "renderTemplate" is defined', () => {
      beforeEach(() => {
        sinon.stub(adapter, "render").callsFake((response, view: string, options: any) => {
          return response.render(view, options);
        });
      });
      it('should call "res.render()" with expected args', async () => {
        const template = "template";
        const value = "test";
        const response = { render: sinon.spy() };

        sinon.stub(contextCreator, "reflectRenderTemplate").returns(template);

        const handler = contextCreator.createHandleResponseFn(
          null as any,
          true,
          undefined,
          200,
        ) as HandlerResponseBasicFn;
        await handler(value, response);

        expect(response.render.calledWith(template, value)).to.be.true;
      });
    });
    describe('when "renderTemplate" is undefined', () => {
      it('should not call "res.render()"', async () => {
        const result = Promise.resolve("test");
        const response = { render: sinon.spy() };

        sinon.stub(contextCreator, "reflectResponseHeaders").returns([]);
        sinon.stub(contextCreator, "reflectRenderTemplate").returns(undefined as any);
        sinon.stub(contextCreator, "reflectSse").returns(undefined as any);

        const handler = contextCreator.createHandleResponseFn(
          null as any,
          true,
          undefined,
          200,
        ) as HandlerResponseBasicFn;
        await handler(result, response);

        expect(response.render.called).to.be.false;
      });
    });
    describe('when "redirectResponse" is present', () => {
      beforeEach(() => {
        sinon.stub(adapter, "redirect").callsFake((response, statusCode: number, url: string) => {
          return response.redirect(statusCode, url);
        });
      });
      it('should call "res.redirect()" with expected args', async () => {
        const redirectResponse = {
          url: "https://test.com",
          statusCode: 302,
        };
        const response = { redirect: sinon.spy() };

        const handler = contextCreator.createHandleResponseFn(
          () => {},
          true,
          redirectResponse,
          200,
        ) as HandlerResponseBasicFn;
        await handler(redirectResponse, response);

        expect(response.redirect.calledWith(redirectResponse.statusCode, redirectResponse.url)).to.be.true;
      });
    });

    describe('when "redirectResponse" is undefined', () => {
      it('should not call "res.redirect()"', async () => {
        const result = Promise.resolve("test");
        const response = { redirect: sinon.spy() };

        sinon.stub(contextCreator, "reflectResponseHeaders").returns([]);
        sinon.stub(contextCreator, "reflectRenderTemplate").returns(undefined as any);
        sinon.stub(contextCreator, "reflectSse").returns(undefined as any);

        const handler = contextCreator.createHandleResponseFn(
          null as any,
          true,
          undefined,
          200,
        ) as HandlerResponseBasicFn;
        await handler(result, response);

        expect(response.redirect.called).to.be.false;
      });
    });

    describe("when replying with result", () => {
      it('should call "adapter.reply()" with expected args', async () => {
        const result = Promise.resolve("test");
        const response = {};

        sinon.stub(contextCreator, "reflectRenderTemplate").returns(undefined as any);
        sinon.stub(contextCreator, "reflectSse").returns(undefined as any);

        const handler = contextCreator.createHandleResponseFn(
          null as any,
          false,
          undefined,
          1234,
        ) as HandlerResponseBasicFn;
        const adapterReplySpy = sinon.spy(adapter, "reply");
        await handler(result, response);
        expect(adapterReplySpy.calledOnceWithExactly(sinon.match.same(response), "test", 1234)).to.be.true;
      });
    });

    describe('when "isSse" is enabled', () => {
      it("should delegate result to SseStream", async () => {
        const result = of("test");
        const response = new PassThrough();
        response.write = sinon.spy();

        const request = new PassThrough();
        request.on = sinon.spy();

        sinon.stub(contextCreator, "reflectRenderTemplate").returns(undefined as any);
        sinon.stub(contextCreator, "reflectSse").returns("/");

        const handler = contextCreator.createHandleResponseFn(
          null as any,
          true,
          undefined,
          200,
        ) as HandlerResponseBasicFn;
        await handler(result, response, request);

        expect((response.write as any).called).to.be.true;
        expect((request.on as any).called).to.be.true;
      });

      it("should not allow a non-observable result", async () => {
        const result = Promise.resolve("test");
        const response = new PassThrough();
        const request = new PassThrough();

        sinon.stub(contextCreator, "reflectRenderTemplate").returns(undefined as any);
        sinon.stub(contextCreator, "reflectSse").returns("/");

        const handler = contextCreator.createHandleResponseFn(
          null as any,
          true,
          undefined,
          200,
        ) as HandlerResponseBasicFn;

        try {
          await handler(result, response, request);
        } catch (e: any) {
          expect(e.message).to.equal("You must return an Observable stream to use Server-Sent Events (SSE).");
        }
      });

      it("should apply any headers that exists on the response", async () => {
        const result = of("test");
        const response = new PassThrough() as HeaderStream;
        response.write = sinon.spy();
        response.writeHead = sinon.spy();
        response.flushHeaders = sinon.spy();
        response.getHeaders = sinon.stub().returns({ "access-control-headers": "some-cors-value" });

        const request = new PassThrough();
        request.on = sinon.spy();

        sinon.stub(contextCreator, "reflectRenderTemplate").returns(undefined as any);
        sinon.stub(contextCreator, "reflectSse").returns("/");

        const handler = contextCreator.createHandleResponseFn(
          null as any,
          true,
          undefined,
          200,
        ) as HandlerResponseBasicFn;
        await handler(result, response, request);

        expect(
          (response.writeHead as sinon.SinonSpy).calledWith(
            200,
            sinon.match.hasNested("access-control-headers", "some-cors-value"),
          ),
        ).to.be.true;
      });
    });
  });
});