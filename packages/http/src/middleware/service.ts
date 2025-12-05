import type { BaseMiddlewareConfiguration } from "@venok/integration";
import type { OnModuleInit, Type } from "@venok/core";

import type { RouteInfo } from "~/interfaces/index.js";

import { MiddlewareService } from "@venok/integration";
import { Inject, Injectable } from "@venok/core";

import { HttpConfig } from "~/http/config.js";
import { MiddlewareRoutesMapper } from "~/middleware/routes-mapper.js";
import { MiddlewareBuilder } from "~/middleware/builder.js";
import { HttpExceptionFiltersContext } from "~/filters/context.js";
import { VENOK_ADAPTER_ADD_MIDDLEWARE } from "~/symbol.js";


@Injectable()
export class HttpMiddlewareService
  extends MiddlewareService<BaseMiddlewareConfiguration<Type[], RouteInfo>>
  implements OnModuleInit {
  @Inject(HttpConfig)
  private httpConfig!: HttpConfig;

  private routesMapper!: MiddlewareRoutesMapper;

  declare protected exceptionsFilter: HttpExceptionFiltersContext;

  public onModuleInit(): void {
    this.exceptionsFilter = new HttpExceptionFiltersContext(this.container, this.container.applicationConfig);
    this.routesMapper = new MiddlewareRoutesMapper(this.container, this.httpConfig);
  }

  protected getMiddlewareBuilder(): any {
    return new MiddlewareBuilder(this.routesMapper, this.httpConfig.getHttpAdapterRef());
  }

  protected registerHandler(info: RouteInfo, proxy: (...args: any[]) => void, config: BaseMiddlewareConfiguration): void {
    const adapter = this.httpConfig.getHttpAdapterRef();

    adapter[VENOK_ADAPTER_ADD_MIDDLEWARE](info.path, { use: proxy, method: info.method, excludedPaths: config.exclude as RouteInfo[] });
  }
}
