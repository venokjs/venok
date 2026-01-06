import type { ExternalContextOptions, VenokContextCreator, VenokExceptionFilterContext } from "@venok/core";

export type ExplorerSettings = Partial<{
  contextType: string;
  isRequestScopeSupported: boolean;
  returnProxyValueFromRequestScope: boolean;
  requestContextArgIndex: number;
  options: ExternalContextOptions;
  exceptionsFilterClass: typeof VenokExceptionFilterContext;
  contextCreatorClass: typeof VenokContextCreator;
  metadataKey: string;
}>;