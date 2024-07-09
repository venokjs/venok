import { HttpExceptionFilter } from "./filter";
import { VenokExceptionFilterContext } from "@venok/core/filters/context";

export class RouterExceptionFiltersContext extends VenokExceptionFilterContext {
  public override getExceptionFilter() {
    return new HttpExceptionFilter(this.container);
  }
}
