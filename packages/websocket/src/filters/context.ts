import { VenokExceptionFilterContext } from "@venok/core";
import { WebsocketExceptionFilter } from "~/filters/filter.js";


export class WebsocketExceptionFiltersContext extends VenokExceptionFilterContext {
  public override getExceptionFilter() {
    return new WebsocketExceptionFilter();
  }
}
