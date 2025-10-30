import type { HttpConfig } from "~/application/config.js";

import { VenokContainer, VenokProxy } from "@venok/core";

import { BadRequestException } from "~/errors/bad-request.exception.js";
import { NotFoundException } from "~/errors/not-found.exception.js";
import { RouterExceptionFiltersContext } from "~/filters/context.js";

export class AdapterErrorsHelper {
  private readonly venokProxy: VenokProxy = new VenokProxy();
  private readonly httpExceptionFilter: RouterExceptionFiltersContext;

  constructor(
    private readonly container: VenokContainer,
    private readonly httpConfig: HttpConfig
  ) {
    this.httpExceptionFilter = new RouterExceptionFiltersContext(container, container.applicationConfig);
  }

  public registerNotFoundHandler() {
    const applicationRef = this.httpConfig.getHttpAdapterRef();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const callback = <TRequest, TResponse>(req: TRequest, res: TResponse) => {
      const method = applicationRef.getRequestMethod(req);
      const url = applicationRef.getRequestUrl(req);
      throw new NotFoundException(`Cannot ${method} ${url}`);
    };
    // @ts-expect-error Mismatch types
    const handler = this.httpExceptionFilter.create({}, callback, undefined);
    const proxy = this.venokProxy.createProxy(callback, handler);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    applicationRef.setNotFoundHandler && applicationRef.setNotFoundHandler(proxy, this.httpConfig.getGlobalPrefix());
  }

  public registerExceptionHandler() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const callback = <TError, TRequest, TResponse>(err: TError, req: TRequest, res: TResponse, next: Function) => {
      throw this.mapExternalException(err);
    };
    // @ts-expect-error Mismatch types
    const handler = this.httpExceptionFilter.create({}, callback, undefined);
    const proxy = this.venokProxy.createExceptionLayerProxy(callback, handler);
    const applicationRef = this.httpConfig.getHttpAdapterRef();
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
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
