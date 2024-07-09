import { BaseMiddlewareConfiguration, MiddlewareService } from "@venok/integration";
import { ApplicationContext, Inject, Injectable, OnModuleInit, Type } from "@venok/core";
import { HttpConfig, RequestMethod, RouteInfo } from "@venok/http";

import { MiddlewareBuilder, RouteInfoPathExtractor, RoutesMapper } from "@venok/http/middleware";
import { RouterExceptionFiltersContext } from "@venok/http/filters/context";
import { isRequestMethodAll } from "@venok/http/helpers";

@Injectable()
export class HttpMiddlewareService
  extends MiddlewareService<BaseMiddlewareConfiguration<Type[], RouteInfo>>
  implements OnModuleInit
{
  // @Inject(HttpConfig)
  private httpConfig!: HttpConfig;

  private routesMapper!: RoutesMapper;
  private routeInfoPathExtractor!: RouteInfoPathExtractor;

  protected exceptionsFilter!: RouterExceptionFiltersContext;

  onModuleInit(): any {
    this.exceptionsFilter = new RouterExceptionFiltersContext(this.container, this.container.applicationConfig);
    const context = new ApplicationContext(this.container, this.container.applicationConfig);
    context.selectContextModule();
    this.httpConfig = context.get(HttpConfig);
    this.routesMapper = new RoutesMapper(this.container, this.httpConfig);
    this.routeInfoPathExtractor = new RouteInfoPathExtractor(this.httpConfig);
  }

  protected getMiddlewareBuilder(): any {
    return new MiddlewareBuilder(this.routesMapper, this.httpConfig.getHttpAdapterRef(), this.routeInfoPathExtractor);
  }

  protected async registerHandler(info: RouteInfo, proxy: (...args: any[]) => void): Promise<void> {
    const applicationRef = this.httpConfig.getHttpAdapterRef();
    const paths = this.routeInfoPathExtractor.extractPathsFrom(info);
    const isMethodAll = isRequestMethodAll(info.method);
    const requestMethod = RequestMethod[info.method];
    const router = await applicationRef.createMiddlewareFactory(info.method);
    const middlewareFunction = isMethodAll
      ? proxy
      : <TRequest, TResponse>(req: TRequest, res: TResponse, next: () => void) => {
          if (applicationRef.getRequestMethod && applicationRef.getRequestMethod(req) === requestMethod) {
            return proxy(req, res, next);
          }
          return next();
        };
    paths.forEach((path) => router(path, middlewareFunction));
  }
}
