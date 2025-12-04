import { VenokExceptionFilterContext } from "@venok/core";

import { HttpExceptionFilter } from "~/filters/filter.js";

export class HttpExceptionFiltersContext extends VenokExceptionFilterContext {
  public override getExceptionFilter() {
    return new HttpExceptionFilter(this.container);
  }
}
