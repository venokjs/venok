import { VenokExceptionFilterContext } from "@venok/core";

import { MicroserviceExceptionFilter } from "~/filters/filter.js";

export class MicroserviceExceptionFiltersContext extends VenokExceptionFilterContext {
  public override getExceptionFilter() {
    return new MicroserviceExceptionFilter();
  }
}
