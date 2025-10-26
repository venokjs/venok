import { HttpExceptionFilter } from "./filter.js";
import { VenokExceptionFilterContext } from "@venok/core/filters/context.js";

export class RouterExceptionFiltersContext extends VenokExceptionFilterContext {
  public override getExceptionFilter() {
    return new HttpExceptionFilter(this.container);
  }
}
