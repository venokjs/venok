import { ApplicationConfig, VenokContainer } from "@venok/core";
import { HttpServer } from "../interfaces";
import { HttpExceptionFilter } from "./filter";
import { VenokExceptionFilterContext } from "@venok/core/filters/context";

export class RouterExceptionFiltersContext extends VenokExceptionFilterContext {
  constructor(
    container: VenokContainer,
    config: ApplicationConfig,
    private readonly applicationRef: HttpServer,
  ) {
    super(container, config);
  }

  public override getExceptionFilter() {
    return new HttpExceptionFilter(this.applicationRef);
  }
}
