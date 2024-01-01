import { VenokContainer } from "@venok/core";
import { VenokProxy } from "@venok/core/context";

import { RouterExceptionFiltersContext } from "@venok/http/filters/context";
import { BadRequestException, NotFoundException } from "@venok/http/errors";
import { HttpConfig } from "@venok/http/application/config";

export class AdapterErrorsHelper {
  private readonly venokProxy: VenokProxy = new VenokProxy();
  private readonly httpExceptionFilter: RouterExceptionFiltersContext;

  constructor(
    private readonly container: VenokContainer,
    private readonly httpConfig: HttpConfig,
  ) {
    this.httpExceptionFilter = new RouterExceptionFiltersContext(container, container.applicationConfig);
  }

  public registerNotFoundHandler() {
    const applicationRef = this.httpConfig.getHttpAdapterRef();
    const callback = <TRequest, TResponse>(req: TRequest, res: TResponse) => {
      const method = applicationRef.getRequestMethod(req);
      const url = applicationRef.getRequestUrl(req);
      throw new NotFoundException(`Cannot ${method} ${url}`);
    };
    const handler = this.httpExceptionFilter.create({}, callback, undefined as any);
    const proxy = this.venokProxy.createProxy(callback, handler);
    applicationRef.setNotFoundHandler && applicationRef.setNotFoundHandler(proxy, this.httpConfig.getGlobalPrefix());
  }

  public registerExceptionHandler() {
    const callback = <TError, TRequest, TResponse>(err: TError, req: TRequest, res: TResponse, next: Function) => {
      throw this.mapExternalException(err);
    };
    const handler = this.httpExceptionFilter.create({}, callback as any, undefined as any);
    const proxy = this.venokProxy.createExceptionLayerProxy(callback, handler);
    const applicationRef = this.httpConfig.getHttpAdapterRef();
    applicationRef.setErrorHandler && applicationRef.setErrorHandler(proxy, this.httpConfig.getGlobalPrefix());
  }

  private mapExternalException(err: any) {
    switch (true) {
      // SyntaxError is thrown by Express body-parser when given invalid JSON (#422, #430)
      // URIError is thrown by Express when given a path parameter with an invalid percentage
      // encoding, e.g. '%FF' (#8915)
      case err instanceof SyntaxError || err instanceof URIError:
        return new BadRequestException(err.message);
      default:
        return err;
    }
  }
}
