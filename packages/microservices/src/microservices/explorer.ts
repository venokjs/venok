import type { InstanceWrapper, VenokParamsFactoryInterface } from "@venok/core";
import type { ExplorerSettings } from "@venok/integration";
import type { Observable } from "rxjs";

import type {
  MessageHandler,
  MicroserviceHandlersMetadata,
  MicroservicePatternHandlerMetadata
} from "~/interfaces/index.js";

import { ExecutionContextHost, Inject, isUndefined, MetadataScanner } from "@venok/core";
import { ExplorerService } from "@venok/integration";
import { forkJoin } from "rxjs";

import { PatternFinder } from "~/microservices/finder.js";
import { MicroserviceConfig } from "~/microservices/config.js";
import { transformToObservable } from "~/helpers/to-observable.helper.js";
import { MicroserviceExceptionFiltersContext } from "~/filters/context.js";
import { MicroserviceParamsFactory } from "~/microservices/params-factory.js";


export class MicroserviceExplorerService extends ExplorerService<MicroserviceHandlersMetadata> {
  @Inject(MicroserviceConfig)
  private microserviceConfig!: MicroserviceConfig;

  private patternFinder = new PatternFinder(new MetadataScanner());

  protected paramsFactory!: VenokParamsFactoryInterface<unknown>;

  public onModuleInit() {
    this.paramsFactory = new MicroserviceParamsFactory();
  }

  protected getSettings(): ExplorerSettings {
    return {
      contextType: "microservice",
      isRequestScopeSupported: true,
      returnProxyValueFromRequestScope: true,
      exceptionsFilterClass: MicroserviceExceptionFiltersContext,
      options: { guards: true, interceptors: true, filters: true },
    };
  }

  protected filterProperties(wrapper: InstanceWrapper, metadataKey: string) {
    if (!wrapper.metatype) return;

    const isMicroservice = this.get(metadataKey, wrapper.metatype);
    if (!isMicroservice) return;

    const patternHandlers = this.patternFinder.explore(wrapper.instance as object);

    const transportId = this.microserviceConfig.transportId;

    const patterns = patternHandlers
      .filter(
        ({ transport }) =>
          isUndefined(transport) ||
          isUndefined(transportId) ||
          transport === transportId
      )
      .reduce((acc, handler) => {
        handler.patterns.forEach(pattern => acc.push({ ...handler, patterns: [pattern] }));
        return acc;
      }, [] as MicroservicePatternHandlerMetadata[]);


    const handlers = patterns.map(definition => {
      const {
        patterns: [pattern],
        methodKey,
        extras,
        isEventHandler,
      } = definition;

      const proxy = this.createCallback(wrapper, methodKey);

      if (isEventHandler) {
        const eventHandler = this.createEventHandler(proxy, wrapper.isDependencyTreeStatic());
        
        return { pattern, callback: eventHandler, isEventHandler, extras };
      }

      return { pattern, callback: proxy, isEventHandler, extras };
    });

    return { handlers };
  }

  private createEventHandler(proxy: (...args: any[]) => Promise<any>, isStatic: boolean): MessageHandler {
    const eventHandler: MessageHandler = async (...args: unknown[]) => {
      const originalArgs = args;
      const hasContextHost = args[0] instanceof ExecutionContextHost;
      if (hasContextHost && isStatic) {
        args = args.slice(1, args.length);
      }
      if (!hasContextHost && !isStatic) {
        const ctx = new ExecutionContextHost(args);
        ctx.setType(this.type);
        args.unshift(ctx);
        originalArgs.unshift(ctx);
      }
      const returnValue = proxy(...args);
      return this.forkJoinHandlersIfAttached(returnValue, originalArgs, eventHandler);
    };

    return eventHandler;
  }

  protected getOriginalArgsForHandler(args: any[]) {
    if (args[0] instanceof ExecutionContextHost) {
      const [, ...rest] = args;
      return rest;
    }
    return args;
  }

  public forkJoinHandlersIfAttached(
    currentReturnValue: Promise<unknown> | Observable<unknown>,
    originalArgs: unknown[],
    handlerRef: MessageHandler
  ) {
    if (handlerRef.next) {
      const returnedValueWrapper = handlerRef.next(
        ...(originalArgs as Parameters<MessageHandler>)
      );
      return forkJoin({
        current: transformToObservable(currentReturnValue),
        next: transformToObservable(returnedValueWrapper),
      });
    }
    return currentReturnValue;
  }
}